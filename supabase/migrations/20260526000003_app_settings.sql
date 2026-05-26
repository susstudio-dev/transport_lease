-- ============================================================================
-- 20260526000003_app_settings
-- Single-row table holding your company's identity for invoices, etc.
-- Singleton enforced by check constraint on a fixed primary key.
-- ============================================================================

create table public.app_settings (
  id boolean primary key default true check (id = true),
  company_name text not null default 'Your Company Name',
  legal_name text not null default 'Your Company Name Pvt Ltd',
  gstin text,
  pan text,
  state_code char(2),
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  primary_contact_email citext,
  primary_contact_phone text,
  invoice_prefix text not null default 'INV',
  default_hsn_code text not null default '9966',
  default_gst_rate numeric(5, 2) not null default 18.00,
  payment_terms_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Singleton row holding company-wide settings (GSTIN, address, invoice prefix).';

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed the singleton row with placeholders. Update via super_admin UI later.
insert into public.app_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;

-- Anyone authenticated can READ the singleton (needed by all roles for company
-- name / GSTIN on invoices, payment pages, etc.).
create policy "app_settings: authenticated can select"
  on public.app_settings
  for select
  to authenticated
  using (true);

-- Only super_admin can write.
create policy "app_settings: super_admin can update"
  on public.app_settings
  for update
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');
