-- ============================================================================
-- 20260526000008_service_requests
-- Tickets raised by corporate_admin about a leased vehicle.
-- corporate_id is denormalized for fast RLS evaluation.
-- ============================================================================

create sequence public.service_request_number_seq start 1;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique
    default 'SR-' || to_char(nextval('public.service_request_number_seq'), 'FM000000'),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  corporate_id uuid not null references public.corporates(id) on delete restrict,
  category public.service_category not null,
  urgency public.service_urgency not null default 'medium',
  description text not null,
  photo_paths text[] not null default '{}',
  status public.service_status not null default 'open',
  assigned_vendor text,
  vendor_eta timestamptz,
  billable_amount numeric(12, 2) check (billable_amount is null or billable_amount >= 0),
  billable_description text,
  resolved_at timestamptz,
  closed_at timestamptz,
  raised_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_requests is
  'Service / breakdown / accident tickets raised by corporates against leased vehicles.';

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_request_events — append-only timeline.
-- ---------------------------------------------------------------------------
create table public.service_request_events (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  event_type text not null,
  from_status public.service_status,
  to_status public.service_status,
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — service_requests
-- ---------------------------------------------------------------------------
alter table public.service_requests enable row level security;

create policy "service_requests: super_admin all"
  on public.service_requests
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "service_requests: finance read"
  on public.service_requests
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

-- corporate_admin: read own corporate's tickets.
create policy "service_requests: corporate_admin read own"
  on public.service_requests
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- corporate_admin: insert tickets for own corporate, must reference one of
-- their own active/expiring_soon contracts. Status forced to 'open'.
create policy "service_requests: corporate_admin insert own"
  on public.service_requests
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
    and status = 'open'
    and exists (
      select 1 from public.contracts c
      where c.id = service_requests.contract_id
        and c.corporate_id = public.current_corporate_id()
        and c.status in ('active', 'expiring_soon')
    )
  );

-- corporate_admin: update only their own open tickets, and only allowed-fields
-- (description, photo_paths). The constraint on which columns can change is
-- enforced in the application — RLS only gates row access.
create policy "service_requests: corporate_admin update own open"
  on public.service_requests
  for update
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
    and status = 'open'
  )
  with check (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- ---------------------------------------------------------------------------
-- RLS — service_request_events
-- ---------------------------------------------------------------------------
alter table public.service_request_events enable row level security;

create policy "service_request_events: super_admin all"
  on public.service_request_events
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "service_request_events: finance read"
  on public.service_request_events
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "service_request_events: corporate_admin read own"
  on public.service_request_events
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1 from public.service_requests sr
      where sr.id = service_request_events.service_request_id
        and sr.corporate_id = public.current_corporate_id()
    )
  );
