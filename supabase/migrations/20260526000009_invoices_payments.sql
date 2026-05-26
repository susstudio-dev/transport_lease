-- ============================================================================
-- 20260526000009_invoices_payments
-- Invoices (GST-aware), line items, and recorded payments.
-- ============================================================================

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  corporate_id uuid not null references public.corporates(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  billing_period_start date not null,
  billing_period_end date not null,
  issue_date date not null default current_date,
  due_date date not null,
  place_of_supply_state_code char(2),
  is_inter_state boolean not null default false,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  cgst numeric(12, 2) not null default 0 check (cgst >= 0),
  sgst numeric(12, 2) not null default 0 check (sgst >= 0),
  igst numeric(12, 2) not null default 0 check (igst >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  status public.invoice_status not null default 'draft',
  razorpay_order_id text,
  razorpay_payment_link text,
  pdf_path text,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,

  constraint invoices_period_consistent check (billing_period_end >= billing_period_start),
  constraint invoices_due_after_issue check (due_date >= issue_date),
  -- Either inter-state (IGST > 0, CGST = SGST = 0) or intra-state (vice versa).
  constraint invoices_tax_consistent check (
    (is_inter_state and cgst = 0 and sgst = 0)
    or (not is_inter_state and igst = 0)
  )
);

comment on table public.invoices is
  'GST-compliant invoices. Tax split: IGST for inter-state, CGST+SGST for intra-state.';

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger invoices_audit
  after insert or update or delete on public.invoices
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------
create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  hsn_code text not null default '9966',
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  taxable_value numeric(12, 2) not null check (taxable_value >= 0),
  gst_rate numeric(5, 2) not null default 18.00 check (gst_rate >= 0),
  position smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger invoice_line_items_set_updated_at
  before update on public.invoice_line_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments
-- corporate_id denormalized for RLS speed. razorpay_payment_id unique so
-- webhook retries are idempotent.
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  corporate_id uuid not null references public.corporates(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  razorpay_signature text,
  reference_number text,
  paid_at timestamptz not null default now(),
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- RLS — invoices
-- ---------------------------------------------------------------------------
alter table public.invoices enable row level security;

create policy "invoices: super_admin all"
  on public.invoices
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "invoices: finance all"
  on public.invoices
  for all
  to authenticated
  using (public.current_user_role() = 'finance')
  with check (public.current_user_role() = 'finance');

create policy "invoices: corporate_admin read own"
  on public.invoices
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );

-- ---------------------------------------------------------------------------
-- RLS — invoice_line_items
-- ---------------------------------------------------------------------------
alter table public.invoice_line_items enable row level security;

create policy "invoice_lines: super_admin all"
  on public.invoice_line_items
  for all
  to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "invoice_lines: finance all"
  on public.invoice_line_items
  for all
  to authenticated
  using (public.current_user_role() = 'finance')
  with check (public.current_user_role() = 'finance');

create policy "invoice_lines: corporate_admin read own"
  on public.invoice_line_items
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_line_items.invoice_id
        and i.corporate_id = public.current_corporate_id()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — payments
-- ---------------------------------------------------------------------------
alter table public.payments enable row level security;

create policy "payments: super_admin read"
  on public.payments
  for select
  to authenticated
  using (public.current_user_role() = 'super_admin');

create policy "payments: finance all"
  on public.payments
  for all
  to authenticated
  using (public.current_user_role() = 'finance')
  with check (public.current_user_role() = 'finance');

create policy "payments: corporate_admin read own"
  on public.payments
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and corporate_id = public.current_corporate_id()
  );
