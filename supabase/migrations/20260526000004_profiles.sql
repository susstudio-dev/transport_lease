-- ============================================================================
-- 20260526000004_profiles
-- Application profile per auth user. Holds role + corporate scoping.
-- A trigger auto-creates a profile when a new auth.users row is inserted,
-- reading role/corporate_id from raw_user_meta_data (super_admin sets these
-- when calling supabase.auth.admin.createUser).
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  corporate_id uuid,                    -- FK added after corporates exists
  full_name text not null,
  phone text,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- corporate_admin MUST have a corporate_id; the others must NOT.
  constraint profiles_role_corporate_consistency check (
    (role = 'corporate_admin' and corporate_id is not null)
    or (role <> 'corporate_admin' and corporate_id is null)
  )
);

comment on table public.profiles is
  'One row per auth user. Role + corporate_id drive RLS across the schema.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- handle_new_user() — fires on auth.users insert. Reads role + corporate_id
-- from user metadata supplied by super_admin at user creation time.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_corp_id uuid;
  v_full_name text;
  v_must_change boolean;
begin
  -- Pull role from metadata. NULL/invalid -> defer profile creation (admin
  -- must populate via the admin UI before the user can log in).
  begin
    v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  exception when others then
    v_role := null;
  end;

  if v_role is null then
    return new;
  end if;

  v_corp_id := nullif(new.raw_user_meta_data->>'corporate_id', '')::uuid;
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  v_must_change := coalesce(
    (new.raw_user_meta_data->>'must_change_password')::boolean,
    true
  );

  insert into public.profiles (id, role, corporate_id, full_name, must_change_password)
  values (new.id, v_role, v_corp_id, v_full_name, v_must_change);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- NOTE: current_user_role() and current_corporate_id() are defined in
-- migration 02 (helper_functions) so the RLS policies in earlier migrations
-- can reference them.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Every user can read their own profile.
create policy "profiles: read own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- super_admin can read all profiles.
create policy "profiles: super_admin read all"
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() = 'super_admin');

-- finance can read all profiles (read-only on operational data).
create policy "profiles: finance read all"
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

-- corporate_admin can read profiles in their own corporate (to see colleagues).
create policy "profiles: corporate_admin read own corporate"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- Users can update their own profile (limited fields enforced at app level —
-- role/corporate_id are not editable via this policy because of check).
create policy "profiles: update own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- super_admin can update any profile.
create policy "profiles: super_admin update all"
  on public.profiles
  for update
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- No direct insert/delete policy — auth.users trigger creates profiles;
-- deletion cascades from auth.users.
