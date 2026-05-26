-- ============================================================================
-- 20260526000015_service_request_functions
-- Atomic status transitions for service requests. Each function performs an
-- authz check (super_admin only) + UPDATE + INSERT into service_request_events
-- in one transaction.
-- ============================================================================

create or replace function public.assign_service_request(
  p_id uuid,
  p_vendor text,
  p_eta timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sr record;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_vendor is null or length(btrim(p_vendor)) = 0 then
    raise exception 'Vendor name is required' using errcode = 'P0001';
  end if;

  select id, status into v_sr
  from public.service_requests
  where id = p_id
  for update;

  if not found then
    raise exception 'Service request not found' using errcode = 'P0001';
  end if;
  if v_sr.status not in ('open', 'in_progress') then
    raise exception 'Cannot assign vendor in status %', v_sr.status using errcode = 'P0001';
  end if;

  update public.service_requests
     set assigned_vendor = btrim(p_vendor),
         vendor_eta = p_eta,
         status = 'in_progress'
   where id = p_id;

  insert into public.service_request_events(
    service_request_id, event_type, from_status, to_status, note, actor_user_id
  )
  values (
    p_id,
    case when v_sr.status = 'in_progress' then 'reassigned' else 'assigned' end,
    v_sr.status,
    'in_progress',
    'Vendor: ' || btrim(p_vendor) || coalesce(' • ETA ' || to_char(p_eta, 'YYYY-MM-DD HH24:MI'), ''),
    auth.uid()
  );
end;
$$;

grant execute on function public.assign_service_request(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.resolve_service_request(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sr record;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select id, status into v_sr from public.service_requests where id = p_id for update;
  if not found then raise exception 'Service request not found' using errcode = 'P0001'; end if;
  if v_sr.status <> 'in_progress' then
    raise exception 'Only in-progress tickets can be resolved (current: %)', v_sr.status
      using errcode = 'P0001';
  end if;

  update public.service_requests
     set status = 'resolved',
         resolved_at = now()
   where id = p_id;

  insert into public.service_request_events(
    service_request_id, event_type, from_status, to_status, note, actor_user_id
  )
  values (p_id, 'resolved', 'in_progress', 'resolved', nullif(btrim(p_note), ''), auth.uid());
end;
$$;

grant execute on function public.resolve_service_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.close_service_request(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sr record;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select id, status into v_sr from public.service_requests where id = p_id for update;
  if not found then raise exception 'Service request not found' using errcode = 'P0001'; end if;
  if v_sr.status not in ('resolved', 'in_progress', 'open') then
    raise exception 'Cannot close ticket in status %', v_sr.status using errcode = 'P0001';
  end if;

  update public.service_requests
     set status = 'closed',
         closed_at = now()
   where id = p_id;

  insert into public.service_request_events(
    service_request_id, event_type, from_status, to_status, note, actor_user_id
  )
  values (p_id, 'closed', v_sr.status, 'closed', nullif(btrim(p_note), ''), auth.uid());
end;
$$;

grant execute on function public.close_service_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Optional billable cost setter (super_admin / finance). Doesn't transition
-- status, just stamps billing fields so the next monthly invoice (M11) picks
-- up the pass-through.
-- ---------------------------------------------------------------------------
create or replace function public.set_service_request_billable(
  p_id uuid,
  p_amount numeric,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('super_admin', 'finance') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be zero or positive' using errcode = 'P0001';
  end if;

  update public.service_requests
     set billable_amount = p_amount,
         billable_description = nullif(btrim(p_description), '')
   where id = p_id;

  insert into public.service_request_events(
    service_request_id, event_type, note, actor_user_id
  )
  values (
    p_id,
    'billable_updated',
    'Billable: ₹' || to_char(p_amount, 'FM999999990.00')
      || coalesce(' — ' || nullif(btrim(p_description), ''), ''),
    auth.uid()
  );
end;
$$;

grant execute on function public.set_service_request_billable(uuid, numeric, text) to authenticated;
