-- ============================================================================
-- 20260526000002_helper_functions
-- Helper SQL functions: updated_at trigger, audit trigger, current-user
-- accessors used by RLS, and invoice number generation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- set_updated_at() — generic trigger to keep updated_at fresh on row changes.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- current_user_role() / current_corporate_id() — used by RLS policies on
-- every table. Implemented in plpgsql so the function body isn't validated
-- at create time — public.profiles doesn't exist yet at this point in the
-- migration order. SECURITY DEFINER + empty search_path bypasses RLS on
-- profiles (preventing recursion) and blocks search_path hijacking.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  return v_role;
end;
$$;

create or replace function public.current_corporate_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_corp uuid;
begin
  select corporate_id into v_corp from public.profiles where id = auth.uid();
  return v_corp;
end;
$$;

-- ---------------------------------------------------------------------------
-- log_audit() — generic AFTER trigger that captures row changes for critical
-- tables. Attached to corporates, vehicles, contracts, invoices, payments in
-- the migration where each table is defined.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_id uuid;
begin
  v_entity_id := coalesce((new).id, (old).id);

  insert into public.audit_log(
    actor_user_id, action, entity_type, entity_id, before_json, after_json
  )
  values (
    auth.uid(),
    lower(tg_op)::public.audit_action,
    tg_table_name,
    v_entity_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- generate_invoice_number(issue_date) — FY-aware (Apr–Mar). Atomic via
-- invoice_sequences upsert. Format: {prefix}/{FY}/{6-digit-seq}, e.g.
--   INV/2026-27/000001
-- ---------------------------------------------------------------------------
create table public.invoice_sequences (
  fiscal_year text primary key,
  last_number integer not null default 0
);

comment on table public.invoice_sequences is
  'One row per Indian fiscal year tracking the last issued invoice number.';

create or replace function public.generate_invoice_number(issue_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  fy_start_year int;
  fy_str text;
  next_num int;
  prefix text;
begin
  fy_start_year := case
    when extract(month from issue_date) >= 4
      then extract(year from issue_date)::int
    else extract(year from issue_date)::int - 1
  end;
  fy_str := fy_start_year::text || '-' || lpad(((fy_start_year + 1) % 100)::text, 2, '0');

  insert into public.invoice_sequences(fiscal_year, last_number)
    values (fy_str, 1)
  on conflict (fiscal_year)
    do update set last_number = public.invoice_sequences.last_number + 1
  returning last_number into next_num;

  select coalesce(invoice_prefix, 'INV') into prefix from public.app_settings limit 1;

  return prefix || '/' || fy_str || '/' || lpad(next_num::text, 6, '0');
end;
$$;
