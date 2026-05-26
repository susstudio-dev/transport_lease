-- ============================================================================
-- 20260526000005_corporates
-- Corporate clients + their KYC documents.
-- ============================================================================

create table public.corporates (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  gstin text unique,
  pan text,
  state_code char(2),
  primary_contact_name text,
  primary_contact_email citext,
  primary_contact_phone text,
  billing_address jsonb not null default '{}'::jsonb,
  status public.corporate_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table public.corporates is
  'B2B clients leasing vehicles. corporate_admin profiles are scoped to one row here.';

create trigger corporates_set_updated_at
  before update on public.corporates
  for each row execute function public.set_updated_at();

create trigger corporates_audit
  after insert or update or delete on public.corporates
  for each row execute function public.log_audit();

-- Add the deferred FK from profiles.corporate_id now that corporates exists.
alter table public.profiles
  add constraint profiles_corporate_id_fkey
  foreign key (corporate_id) references public.corporates(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- corporate_kyc_documents
-- ---------------------------------------------------------------------------
create table public.corporate_kyc_documents (
  id uuid primary key default gen_random_uuid(),
  corporate_id uuid not null references public.corporates(id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger corporate_kyc_documents_set_updated_at
  before update on public.corporate_kyc_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — corporates
-- ---------------------------------------------------------------------------
alter table public.corporates enable row level security;

create policy "corporates: super_admin all"
  on public.corporates
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "corporates: finance read"
  on public.corporates
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "corporates: corporate_admin read own"
  on public.corporates
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and id = public.current_corporate_id()
  );

-- ---------------------------------------------------------------------------
-- RLS — corporate_kyc_documents
-- ---------------------------------------------------------------------------
alter table public.corporate_kyc_documents enable row level security;

create policy "kyc: super_admin all"
  on public.corporate_kyc_documents
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "kyc: finance read"
  on public.corporate_kyc_documents
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "kyc: corporate_admin read own"
  on public.corporate_kyc_documents
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );
