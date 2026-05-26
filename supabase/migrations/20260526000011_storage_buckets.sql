-- ============================================================================
-- 20260526000011_storage_buckets
-- Create private storage buckets + RLS policies on storage.objects.
--
-- Path convention enforced in policies:
--   corporate-kyc/{corporate_id}/...
--   vehicle-documents/{vehicle_id}/...
--   service-request-photos/{corporate_id}/{service_request_id}/...
--   invoices/{corporate_id}/{invoice_id}.pdf
--   lease-agreements/{corporate_id}/{contract_id}.pdf
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('corporate-kyc', 'corporate-kyc', false),
  ('vehicle-documents', 'vehicle-documents', false),
  ('service-request-photos', 'service-request-photos', false),
  ('invoices', 'invoices', false),
  ('lease-agreements', 'lease-agreements', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- corporate-kyc
-- ---------------------------------------------------------------------------
create policy "storage kyc: super_admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'corporate-kyc' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'corporate-kyc' and public.current_user_role() = 'super_admin');

create policy "storage kyc: corporate_admin read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'corporate-kyc'
    and public.current_user_role() = 'corporate_admin'
    and (storage.foldername(name))[1] = public.current_corporate_id()::text
  );

-- ---------------------------------------------------------------------------
-- vehicle-documents — corporate_admin can read only if currently leasing.
-- ---------------------------------------------------------------------------
create policy "storage vehicle_docs: super_admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'vehicle-documents' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'vehicle-documents' and public.current_user_role() = 'super_admin');

create policy "storage vehicle_docs: finance read"
  on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-documents' and public.current_user_role() = 'finance');

create policy "storage vehicle_docs: corporate_admin read leased"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and public.current_user_role() = 'corporate_admin'
    and exists (
      select 1 from public.contracts c
      where c.vehicle_id::text = (storage.foldername(name))[1]
        and c.corporate_id = public.current_corporate_id()
        and c.status in ('active', 'expiring_soon')
    )
  );

-- ---------------------------------------------------------------------------
-- service-request-photos — path: {corporate_id}/{service_request_id}/...
-- corporate_admin can upload to their own corporate folder.
-- ---------------------------------------------------------------------------
create policy "storage sr_photos: super_admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'service-request-photos' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'service-request-photos' and public.current_user_role() = 'super_admin');

create policy "storage sr_photos: corporate_admin read/write own"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'service-request-photos'
    and public.current_user_role() = 'corporate_admin'
    and (storage.foldername(name))[1] = public.current_corporate_id()::text
  )
  with check (
    bucket_id = 'service-request-photos'
    and public.current_user_role() = 'corporate_admin'
    and (storage.foldername(name))[1] = public.current_corporate_id()::text
  );

-- ---------------------------------------------------------------------------
-- invoices — super_admin/finance write, corporate_admin reads own corp.
-- ---------------------------------------------------------------------------
create policy "storage invoices: super_admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'invoices' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'invoices' and public.current_user_role() = 'super_admin');

create policy "storage invoices: finance all"
  on storage.objects for all to authenticated
  using (bucket_id = 'invoices' and public.current_user_role() = 'finance')
  with check (bucket_id = 'invoices' and public.current_user_role() = 'finance');

create policy "storage invoices: corporate_admin read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and public.current_user_role() = 'corporate_admin'
    and (storage.foldername(name))[1] = public.current_corporate_id()::text
  );

-- ---------------------------------------------------------------------------
-- lease-agreements
-- ---------------------------------------------------------------------------
create policy "storage agreements: super_admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'lease-agreements' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'lease-agreements' and public.current_user_role() = 'super_admin');

create policy "storage agreements: finance read"
  on storage.objects for select to authenticated
  using (bucket_id = 'lease-agreements' and public.current_user_role() = 'finance');

create policy "storage agreements: corporate_admin read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lease-agreements'
    and public.current_user_role() = 'corporate_admin'
    and (storage.foldername(name))[1] = public.current_corporate_id()::text
  );
