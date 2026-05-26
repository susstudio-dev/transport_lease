-- ============================================================================
-- 20260526000012_indexes
-- Performance indexes for FKs and common query filters / sorts.
-- Postgres auto-indexes primary keys and UNIQUE columns; everything else here.
-- ============================================================================

-- profiles
create index profiles_corporate_id_idx on public.profiles (corporate_id) where corporate_id is not null;
create index profiles_role_idx on public.profiles (role);

-- corporates
create index corporates_status_idx on public.corporates (status);
create index corporates_legal_name_idx on public.corporates (lower(legal_name));

-- corporate_kyc_documents
create index corporate_kyc_corporate_id_idx on public.corporate_kyc_documents (corporate_id);

-- vehicles
create index vehicles_status_idx on public.vehicles (status);
create index vehicles_make_model_idx on public.vehicles (make, model);

-- vehicle_documents
create index vehicle_documents_vehicle_id_idx on public.vehicle_documents (vehicle_id);
create index vehicle_documents_expiry_idx on public.vehicle_documents (expiry_date);
create index vehicle_documents_doc_type_idx on public.vehicle_documents (doc_type);

-- contracts
create index contracts_corporate_id_idx on public.contracts (corporate_id);
create index contracts_vehicle_id_idx on public.contracts (vehicle_id);
create index contracts_status_idx on public.contracts (status);
create index contracts_end_date_idx on public.contracts (end_date);
create index contracts_corp_status_idx on public.contracts (corporate_id, status);

-- contract_events
create index contract_events_contract_id_idx on public.contract_events (contract_id, created_at desc);

-- service_requests
create index service_requests_corporate_id_idx on public.service_requests (corporate_id);
create index service_requests_vehicle_id_idx on public.service_requests (vehicle_id);
create index service_requests_contract_id_idx on public.service_requests (contract_id);
create index service_requests_status_idx on public.service_requests (status);
create index service_requests_corp_status_idx on public.service_requests (corporate_id, status);

-- service_request_events
create index service_request_events_sr_id_idx
  on public.service_request_events (service_request_id, created_at desc);

-- invoices
create index invoices_corporate_id_idx on public.invoices (corporate_id);
create index invoices_contract_id_idx on public.invoices (contract_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_due_date_idx on public.invoices (due_date);
create index invoices_corp_status_idx on public.invoices (corporate_id, status);
create index invoices_status_due_idx on public.invoices (status, due_date)
  where status in ('issued', 'overdue');

-- invoice_line_items
create index invoice_line_items_invoice_id_idx
  on public.invoice_line_items (invoice_id, position);

-- payments
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_corporate_id_idx on public.payments (corporate_id);
create index payments_paid_at_idx on public.payments (paid_at desc);

-- notifications_log
create index notifications_log_corporate_id_idx
  on public.notifications_log (corporate_id) where corporate_id is not null;
create index notifications_log_status_idx on public.notifications_log (status);
create index notifications_log_entity_idx
  on public.notifications_log (related_entity_type, related_entity_id);

-- audit_log
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_user_id, created_at desc);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
