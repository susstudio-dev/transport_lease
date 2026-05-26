-- ============================================================================
-- 20260526000010_notifications_audit
-- notifications_log: every email/SMS attempt with status + provider response.
-- audit_log: row-level change history for critical tables.
-- ============================================================================

create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  channel public.notification_channel not null,
  recipient text not null,
  subject text,
  body_excerpt text,
  related_entity_type text,
  related_entity_id uuid,
  corporate_id uuid references public.corporates(id) on delete set null,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notifications_log is
  'One row per email/SMS send attempt. Populated by send-notification Edge Function.';

create trigger notifications_log_set_updated_at
  before update on public.notifications_log
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log — write-only via log_audit() trigger. No app-level inserts.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only change log for corporates, vehicles, contracts, invoices, payments. Written by log_audit() trigger.';

-- ---------------------------------------------------------------------------
-- RLS — notifications_log
-- ---------------------------------------------------------------------------
alter table public.notifications_log enable row level security;

create policy "notifications: super_admin read"
  on public.notifications_log
  for select
  to authenticated
  using (public.current_user_role() = 'super_admin');

create policy "notifications: finance read"
  on public.notifications_log
  for select
  to authenticated
  using (public.current_user_role() = 'finance');

create policy "notifications: corporate_admin read own"
  on public.notifications_log
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- No INSERT/UPDATE/DELETE policies — writes happen via service role in the
-- Edge Function, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- RLS — audit_log
-- ---------------------------------------------------------------------------
alter table public.audit_log enable row level security;

create policy "audit_log: super_admin read"
  on public.audit_log
  for select
  to authenticated
  using (public.current_user_role() = 'super_admin');

-- No policies for any other role. Writes happen via log_audit() security
-- definer trigger, which bypasses RLS.
