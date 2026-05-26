-- ============================================================================
-- 20260526000016_invoice_functions
-- Atomic invoice status transitions + totals recomputation. All operate
-- under super_admin or finance — checked at the top of each function.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- recompute_invoice_totals(p_id)
-- Aggregates line items into the parent invoice's subtotal / cgst / sgst /
-- igst / total. Called automatically by triggers on invoice_line_items
-- writes, so the parent row is always consistent.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_invoice_totals(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_subtotal numeric(12, 2) := 0;
  v_cgst numeric(12, 2) := 0;
  v_sgst numeric(12, 2) := 0;
  v_igst numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_inter boolean;
  rec record;
begin
  select id, is_inter_state into v_inv from public.invoices where id = p_id for update;
  if not found then return; end if;
  v_inter := coalesce(v_inv.is_inter_state, false);

  for rec in
    select taxable_value, gst_rate
    from public.invoice_line_items
    where invoice_id = p_id
  loop
    v_subtotal := v_subtotal + rec.taxable_value;
    if v_inter then
      v_igst := v_igst + (rec.taxable_value * rec.gst_rate / 100);
    else
      v_cgst := v_cgst + (rec.taxable_value * rec.gst_rate / 200);
      v_sgst := v_sgst + (rec.taxable_value * rec.gst_rate / 200);
    end if;
  end loop;

  v_total := v_subtotal + v_cgst + v_sgst + v_igst;

  update public.invoices
     set subtotal = round(v_subtotal, 2),
         cgst = round(v_cgst, 2),
         sgst = round(v_sgst, 2),
         igst = round(v_igst, 2),
         total = round(v_total, 2)
   where id = p_id;
end;
$$;

grant execute on function public.recompute_invoice_totals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: any change in invoice_line_items recomputes its parent's totals.
-- ---------------------------------------------------------------------------
create or replace function public.line_items_touch_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  v_target := coalesce((new).invoice_id, (old).invoice_id);
  if v_target is not null then
    perform public.recompute_invoice_totals(v_target);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_line_items_recompute on public.invoice_line_items;
create trigger invoice_line_items_recompute
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.line_items_touch_parent();

-- ---------------------------------------------------------------------------
-- issue_invoice(p_id)
-- draft → issued. Stamps issue_date if missing; recomputes totals one last
-- time so we never publish a stale subtotal.
-- ---------------------------------------------------------------------------
create or replace function public.issue_invoice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('super_admin', 'finance') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select id, status, total into v_inv from public.invoices where id = p_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0001'; end if;
  if v_inv.status <> 'draft' then
    raise exception 'Only drafts can be issued (current: %)', v_inv.status using errcode = 'P0001';
  end if;

  perform public.recompute_invoice_totals(p_id);

  -- Re-fetch the now-recomputed total to validate.
  select total into v_inv.total from public.invoices where id = p_id;
  if v_inv.total <= 0 then
    raise exception 'Cannot issue an empty invoice (total is 0)' using errcode = 'P0001';
  end if;

  update public.invoices
     set status = 'issued',
         issue_date = coalesce(issue_date, current_date)
   where id = p_id;
end;
$$;

grant execute on function public.issue_invoice(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_invoice(p_id, p_reason)
-- draft / issued / overdue → cancelled. Paid invoices cannot be cancelled
-- (would require an explicit credit note flow, future work).
-- ---------------------------------------------------------------------------
create or replace function public.cancel_invoice(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('super_admin', 'finance') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'Cancellation reason is required' using errcode = 'P0001';
  end if;

  select id, status into v_inv from public.invoices where id = p_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0001'; end if;
  if v_inv.status not in ('draft', 'issued', 'overdue') then
    raise exception 'Cannot cancel invoice in status %', v_inv.status using errcode = 'P0001';
  end if;

  update public.invoices
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = btrim(p_reason)
   where id = p_id;
end;
$$;

grant execute on function public.cancel_invoice(uuid, text) to authenticated;
