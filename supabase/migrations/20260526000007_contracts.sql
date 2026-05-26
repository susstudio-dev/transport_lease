-- ============================================================================
-- 20260526000007_contracts
-- Lease contract = one corporate leasing one vehicle for N months.
-- ============================================================================

create sequence public.contract_number_seq start 1;

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique
    default 'CTR-' || to_char(nextval('public.contract_number_seq'), 'FM000000'),
  corporate_id uuid not null references public.corporates(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  tenure_months smallint not null check (tenure_months > 0 and tenure_months <= 120),
  start_date date not null,
  end_date date not null,
  monthly_rental numeric(12, 2) not null check (monthly_rental >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  km_cap_per_month integer check (km_cap_per_month is null or km_cap_per_month >= 0),
  fuel_responsibility public.responsibility not null default 'client',
  insurance_responsibility public.responsibility not null default 'company',
  status public.contract_status not null default 'draft',
  agreement_file_path text,
  previous_contract_id uuid references public.contracts(id) on delete set null,
  terminated_at timestamptz,
  termination_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,

  constraint contracts_end_after_start check (end_date > start_date),
  constraint contracts_termination_consistent check (
    (status = 'terminated' and terminated_at is not null)
    or (status <> 'terminated')
  )
);

comment on table public.contracts is
  '1 contract = 1 corporate leasing 1 vehicle for N months. Renewal chain via previous_contract_id.';

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

create trigger contracts_audit
  after insert or update or delete on public.contracts
  for each row execute function public.log_audit();

-- A vehicle can have at most one active/expiring_soon contract at a time.
create unique index contracts_one_active_per_vehicle
  on public.contracts (vehicle_id)
  where status in ('active', 'expiring_soon');

-- ---------------------------------------------------------------------------
-- contract_events — append-only log of state changes / notes.
-- ---------------------------------------------------------------------------
create table public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  event_type text not null,
  from_status public.contract_status,
  to_status public.contract_status,
  note text,
  payload jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — contracts
-- ---------------------------------------------------------------------------
alter table public.contracts enable row level security;

create policy "contracts: super_admin all"
  on public.contracts
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "contracts: finance read"
  on public.contracts
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "contracts: corporate_admin read own"
  on public.contracts
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- ---------------------------------------------------------------------------
-- RLS — contract_events
-- ---------------------------------------------------------------------------
alter table public.contract_events enable row level security;

create policy "contract_events: super_admin all"
  on public.contract_events
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "contract_events: finance read"
  on public.contract_events
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "contract_events: corporate_admin read own"
  on public.contract_events
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1 from public.contracts c
      where c.id = contract_events.contract_id
        and c.corporate_id = public.current_corporate_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Deferred corporate_admin policies from vehicles migration.
-- ---------------------------------------------------------------------------
create policy "vehicles: corporate_admin read leased"
  on public.vehicles
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1
      from public.contracts c
      where c.vehicle_id = vehicles.id
        and c.corporate_id = public.current_corporate_id()
        and c.status in ('active', 'expiring_soon')
    )
  );

create policy "vehicle_docs: corporate_admin read leased"
  on public.vehicle_documents
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1
      from public.contracts c
      where c.vehicle_id = vehicle_documents.vehicle_id
        and c.corporate_id = public.current_corporate_id()
        and c.status in ('active', 'expiring_soon')
    )
  );
