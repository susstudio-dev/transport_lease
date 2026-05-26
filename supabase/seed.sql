-- ============================================================================
-- seed.sql — local dev seed data.
--
-- Runs with the `postgres` role (after migrations), so it can write directly
-- into auth.users. NOT used in production.
--
-- Creates:
--   - 1 super_admin    (super@example.com    / Admin@123)
--   - 1 finance        (finance@example.com  / Admin@123)
--   - 1 corporate_admin (acme@example.com    / Admin@123) for Acme Corp
--   - 1 corporate      ("Acme Logistics Pvt Ltd")
--   - 2 vehicles
--   - 1 active contract leasing vehicle #1 to Acme
-- ============================================================================

-- Fixed UUIDs for stable seeding across resets.
do $$
declare
  v_super_id      uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_finance_id    uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_corp_admin_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_corp_id       uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_vehicle1_id   uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  v_vehicle2_id   uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';
  v_contract_id   uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_password_hash text := crypt('Admin@123', gen_salt('bf'));
begin
  -- ---------------------------------------------------------------------------
  -- App settings — placeholder company identity. Update via UI later.
  -- ---------------------------------------------------------------------------
  update public.app_settings
  set
    company_name = 'Your Company Name',
    legal_name = 'Your Company Name Pvt Ltd',
    gstin = '00ABCDE1234F1Z5',
    pan = 'ABCDE1234F',
    state_code = '27',
    state = 'Maharashtra',
    address_line1 = '101 Placeholder Road',
    city = 'Mumbai',
    pincode = '400001',
    primary_contact_email = 'ops@example.com',
    primary_contact_phone = '+91 99999 00000',
    invoice_prefix = 'INV',
    default_hsn_code = '9966',
    default_gst_rate = 18.00,
    payment_terms_days = 7
  where id = true;

  -- ---------------------------------------------------------------------------
  -- Corporate
  -- ---------------------------------------------------------------------------
  insert into public.corporates (
    id, legal_name, display_name, gstin, pan, state_code,
    primary_contact_name, primary_contact_email, primary_contact_phone,
    billing_address, status
  )
  values (
    v_corp_id,
    'Acme Logistics Pvt Ltd',
    'Acme Logistics',
    '29ACMEC0001A1Z2',
    'ACMEC0001A',
    '29',
    'Priya Sharma',
    'priya@acme.example',
    '+91 98765 43210',
    jsonb_build_object(
      'line1', '42 Industrial Estate',
      'city', 'Bengaluru',
      'state', 'Karnataka',
      'pincode', '560001'
    ),
    'active'
  )
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- Auth users (handle_new_user trigger auto-creates profiles).
  -- ---------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_super_id,
    'authenticated',
    'authenticated',
    'super@example.com',
    v_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'super_admin',
      'full_name', 'Super Admin',
      'must_change_password', false
    ),
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    v_finance_id,
    'authenticated',
    'authenticated',
    'finance@example.com',
    v_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'finance',
      'full_name', 'Finance User',
      'must_change_password', false
    ),
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    v_corp_admin_id,
    'authenticated',
    'authenticated',
    'acme@example.com',
    v_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'corporate_admin',
      'corporate_id', v_corp_id::text,
      'full_name', 'Acme Admin',
      'must_change_password', false
    ),
    now(), now(), '', '', '', ''
  )
  on conflict (id) do nothing;

  -- Auth identities (required for email/password login).
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values
    (
      gen_random_uuid(), v_super_id, v_super_id::text,
      jsonb_build_object('sub', v_super_id::text, 'email', 'super@example.com'),
      'email', now(), now(), now()
    ),
    (
      gen_random_uuid(), v_finance_id, v_finance_id::text,
      jsonb_build_object('sub', v_finance_id::text, 'email', 'finance@example.com'),
      'email', now(), now(), now()
    ),
    (
      gen_random_uuid(), v_corp_admin_id, v_corp_admin_id::text,
      jsonb_build_object('sub', v_corp_admin_id::text, 'email', 'acme@example.com'),
      'email', now(), now(), now()
    )
  on conflict (provider_id, provider) do nothing;

  -- ---------------------------------------------------------------------------
  -- Vehicles
  -- ---------------------------------------------------------------------------
  insert into public.vehicles (
    id, registration_number, make, model, variant, year, color,
    fuel_type, transmission, chassis_no, engine_no, seating_capacity,
    purchase_date, purchase_price, status
  )
  values (
    v_vehicle1_id,
    'MH01AB1234',
    'Maruti Suzuki', 'Dzire', 'VXI', 2024, 'White',
    'petrol', 'manual', 'CHASSIS001', 'ENGINE001', 5,
    date '2024-06-15', 825000.00, 'leased'
  ),
  (
    v_vehicle2_id,
    'MH01CD5678',
    'Tata Motors', 'Nexon', 'XZ+', 2024, 'Blue',
    'electric', 'automatic', 'CHASSIS002', 'ENGINE002', 5,
    date '2024-08-01', 1450000.00, 'available'
  )
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- Contract: vehicle1 leased to Acme for 12 months at 25,000/month.
  -- ---------------------------------------------------------------------------
  insert into public.contracts (
    id, corporate_id, vehicle_id, tenure_months,
    start_date, end_date, monthly_rental, security_deposit,
    km_cap_per_month, fuel_responsibility, insurance_responsibility,
    status
  )
  values (
    v_contract_id,
    v_corp_id,
    v_vehicle1_id,
    12,
    date '2026-05-01',
    date '2027-05-01',
    25000.00,
    50000.00,
    2500,
    'client',
    'company',
    'active'
  )
  on conflict (id) do nothing;
end;
$$;
