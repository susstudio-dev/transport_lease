-- ============================================================================
-- 20260526000006_vehicles
-- Fleet master + per-vehicle statutory documents (RC, insurance, PUC, fitness).
-- ============================================================================

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  make text not null,
  model text not null,
  variant text,
  year smallint not null check (year between 1990 and 2100),
  color text,
  fuel_type public.fuel_type not null,
  transmission public.transmission_type not null,
  chassis_no text not null unique,
  engine_no text not null unique,
  seating_capacity smallint check (seating_capacity between 2 and 50),
  purchase_date date,
  purchase_price numeric(12, 2) check (purchase_price >= 0),
  status public.vehicle_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table public.vehicles is
  'Master list of company-owned vehicles. Status tracks current operational state.';

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger vehicles_audit
  after insert or update or delete on public.vehicles
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- vehicle_documents
-- ---------------------------------------------------------------------------
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  doc_type public.vehicle_doc_type not null,
  document_number text,
  issue_date date,
  expiry_date date not null,
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One active doc per (vehicle, type) — newer uploads supersede older ones via
  -- a soft-delete pattern handled in the app layer.
  unique (vehicle_id, doc_type)
);

create trigger vehicle_documents_set_updated_at
  before update on public.vehicle_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — vehicles
-- ---------------------------------------------------------------------------
alter table public.vehicles enable row level security;

create policy "vehicles: super_admin all"
  on public.vehicles
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "vehicles: finance read"
  on public.vehicles
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

-- corporate_admin policy for "vehicles I lease" is added in the contracts
-- migration, since it references public.contracts.

-- ---------------------------------------------------------------------------
-- RLS — vehicle_documents
-- ---------------------------------------------------------------------------
alter table public.vehicle_documents enable row level security;

create policy "vehicle_docs: super_admin all"
  on public.vehicle_documents
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "vehicle_docs: finance read"
  on public.vehicle_documents
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

-- corporate_admin policy for vehicle_documents is added in the contracts
-- migration, since it references public.contracts.
