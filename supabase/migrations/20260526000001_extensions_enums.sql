-- ============================================================================
-- 20260526000001_extensions_enums
-- Extensions, enum types used across the schema.
-- ============================================================================

create extension if not exists "pgcrypto" with schema public;
create extension if not exists "citext" with schema public;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('super_admin', 'corporate_admin', 'finance');

create type public.corporate_status as enum ('active', 'inactive');

create type public.vehicle_status as enum (
  'available',
  'leased',
  'under_service',
  'retired'
);

create type public.fuel_type as enum ('petrol', 'diesel', 'cng', 'electric', 'hybrid');

create type public.transmission_type as enum ('manual', 'automatic');

create type public.vehicle_doc_type as enum ('rc', 'insurance', 'puc', 'fitness');

create type public.contract_status as enum (
  'draft',
  'active',
  'expiring_soon',
  'expired',
  'terminated',
  'renewed'
);

create type public.responsibility as enum ('client', 'company');

create type public.service_category as enum (
  'servicing',
  'breakdown',
  'accident',
  'replacement',
  'other'
);

create type public.service_urgency as enum ('low', 'medium', 'high');

create type public.service_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type public.invoice_status as enum (
  'draft',
  'issued',
  'paid',
  'overdue',
  'cancelled'
);

create type public.payment_method as enum ('razorpay', 'bank_transfer', 'cheque', 'cash');

create type public.notification_channel as enum ('email', 'sms');

create type public.notification_status as enum ('queued', 'sent', 'failed');

create type public.audit_action as enum ('insert', 'update', 'delete');
