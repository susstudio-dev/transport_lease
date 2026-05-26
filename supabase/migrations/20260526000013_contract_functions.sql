-- ============================================================================
-- 20260526000013_contract_functions
-- Atomic status transitions for contracts. Runs as security definer so they
-- can update the vehicles table (super_admin-only via RLS) — explicit role
-- check inside each function gates access.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- activate_contract(p_contract_id)
-- draft → active. Vehicle must be available. If the contract has a
-- previous_contract_id whose status is active/expiring_soon, that previous
-- contract is marked 'renewed' first (the vehicle stays leased throughout —
-- ownership of the lease just changes contracts).
-- ---------------------------------------------------------------------------
create or replace function public.activate_contract(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract record;
  v_caller_role public.user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select id, status, vehicle_id, previous_contract_id
    into v_contract
  from public.contracts
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contract not found' using errcode = 'P0001';
  end if;
  if v_contract.status <> 'draft' then
    raise exception 'Only draft contracts can be activated (current: %)', v_contract.status
      using errcode = 'P0001';
  end if;

  -- Renewal: retire the prior active contract first to free the partial
  -- unique index, and momentarily mark the vehicle available so the
  -- availability check below passes.
  if v_contract.previous_contract_id is not null then
    update public.contracts
       set status = 'renewed'
     where id = v_contract.previous_contract_id
       and status in ('active', 'expiring_soon');

    update public.vehicles
       set status = 'available'
     where id = v_contract.vehicle_id
       and status = 'leased';
  end if;

  perform 1 from public.vehicles
    where id = v_contract.vehicle_id and status = 'available'
    for update;
  if not found then
    raise exception 'Vehicle is not available for activation' using errcode = 'P0001';
  end if;

  update public.contracts set status = 'active' where id = p_contract_id;
  update public.vehicles set status = 'leased' where id = v_contract.vehicle_id;

  insert into public.contract_events(contract_id, event_type, from_status, to_status, actor_user_id)
  values (p_contract_id, 'activated', 'draft', 'active', auth.uid());
end;
$$;

grant execute on function public.activate_contract(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- terminate_contract(p_contract_id, p_reason)
-- active/expiring_soon → terminated. Frees the vehicle.
-- ---------------------------------------------------------------------------
create or replace function public.terminate_contract(p_contract_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract record;
  v_caller_role public.user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select id, status, vehicle_id
    into v_contract
  from public.contracts
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contract not found' using errcode = 'P0001';
  end if;
  if v_contract.status not in ('active', 'expiring_soon') then
    raise exception 'Only active contracts can be terminated (current: %)', v_contract.status
      using errcode = 'P0001';
  end if;

  update public.contracts
     set status = 'terminated',
         terminated_at = now(),
         termination_reason = p_reason
   where id = p_contract_id;

  update public.vehicles
     set status = 'available'
   where id = v_contract.vehicle_id;

  insert into public.contract_events(contract_id, event_type, from_status, to_status, note, actor_user_id)
  values (p_contract_id, 'terminated', v_contract.status, 'terminated', p_reason, auth.uid());
end;
$$;

grant execute on function public.terminate_contract(uuid, text) to authenticated;
