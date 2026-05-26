/**
 * Hand-written to match the M1 migrations. Regenerate from the source of
 * truth (Postgres) with:
 *
 *   npm run db:types
 *
 * Until the local Supabase instance is running, this file is the canonical
 * type definition for the frontend.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type UserRoleEnum = 'super_admin' | 'corporate_admin' | 'finance';
export type CorporateStatusEnum = 'active' | 'inactive';
export type VehicleStatusEnum = 'available' | 'leased' | 'under_service' | 'retired';
export type FuelTypeEnum = 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
export type TransmissionTypeEnum = 'manual' | 'automatic';
export type VehicleDocTypeEnum = 'rc' | 'insurance' | 'puc' | 'fitness';
export type ContractStatusEnum =
  | 'draft'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'renewed';
export type ResponsibilityEnum = 'client' | 'company';
export type ServiceCategoryEnum = 'servicing' | 'breakdown' | 'accident' | 'replacement' | 'other';
export type ServiceUrgencyEnum = 'low' | 'medium' | 'high';
export type ServiceStatusEnum = 'open' | 'in_progress' | 'resolved' | 'closed';
export type InvoiceStatusEnum = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethodEnum = 'razorpay' | 'bank_transfer' | 'cheque' | 'cash';
export type NotificationChannelEnum = 'email' | 'sms';
export type NotificationStatusEnum = 'queued' | 'sent' | 'failed';
export type AuditActionEnum = 'insert' | 'update' | 'delete';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export type AppSettingsRow = {
  id: boolean;
  company_name: string;
  legal_name: string;
  gstin: string | null;
  pan: string | null;
  state_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  invoice_prefix: string;
  default_hsn_code: string;
  default_gst_rate: string; // numeric → string from supabase-js
  payment_terms_days: number;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  role: UserRoleEnum;
  corporate_id: string | null;
  full_name: string;
  phone: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CorporateRow = {
  id: string;
  legal_name: string;
  display_name: string | null;
  gstin: string | null;
  pan: string | null;
  state_code: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  billing_address: Json;
  status: CorporateStatusEnum;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type CorporateKycDocumentRow = {
  id: string;
  corporate_id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  color: string | null;
  fuel_type: FuelTypeEnum;
  transmission: TransmissionTypeEnum;
  chassis_no: string;
  engine_no: string;
  seating_capacity: number | null;
  purchase_date: string | null;
  purchase_price: string | null;
  status: VehicleStatusEnum;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type VehicleDocumentRow = {
  id: string;
  vehicle_id: string;
  doc_type: VehicleDocTypeEnum;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractRow = {
  id: string;
  contract_number: string;
  corporate_id: string;
  vehicle_id: string;
  tenure_months: number;
  start_date: string;
  end_date: string;
  monthly_rental: string;
  security_deposit: string;
  km_cap_per_month: number | null;
  fuel_responsibility: ResponsibilityEnum;
  insurance_responsibility: ResponsibilityEnum;
  status: ContractStatusEnum;
  agreement_file_path: string | null;
  previous_contract_id: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ContractEventRow = {
  id: string;
  contract_id: string;
  event_type: string;
  from_status: ContractStatusEnum | null;
  to_status: ContractStatusEnum | null;
  note: string | null;
  payload: Json | null;
  actor_user_id: string | null;
  created_at: string;
};

export type ServiceRequestRow = {
  id: string;
  ticket_number: string;
  contract_id: string;
  vehicle_id: string;
  corporate_id: string;
  category: ServiceCategoryEnum;
  urgency: ServiceUrgencyEnum;
  description: string;
  photo_paths: string[];
  status: ServiceStatusEnum;
  assigned_vendor: string | null;
  vendor_eta: string | null;
  billable_amount: string | null;
  billable_description: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  raised_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestEventRow = {
  id: string;
  service_request_id: string;
  event_type: string;
  from_status: ServiceStatusEnum | null;
  to_status: ServiceStatusEnum | null;
  note: string | null;
  actor_user_id: string | null;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  corporate_id: string;
  contract_id: string;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  place_of_supply_state_code: string | null;
  is_inter_state: boolean;
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  amount_paid: string;
  status: InvoiceStatusEnum;
  razorpay_order_id: string | null;
  razorpay_payment_link: string | null;
  pdf_path: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  hsn_code: string;
  quantity: string;
  unit_price: string;
  taxable_value: string;
  gst_rate: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  invoice_id: string;
  corporate_id: string;
  amount: string;
  method: PaymentMethodEnum;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_signature: string | null;
  reference_number: string | null;
  paid_at: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationLogRow = {
  id: string;
  channel: NotificationChannelEnum;
  recipient: string;
  subject: string | null;
  body_excerpt: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  corporate_id: string | null;
  status: NotificationStatusEnum;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: AuditActionEnum;
  entity_type: string;
  entity_id: string | null;
  before_json: Json | null;
  after_json: Json | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Database type. Each table provides Row/Insert/Update plus a Relationships
// array (required by supabase-js GenericTable). Insert/Update = Partial<Row>;
// NOT NULL columns are enforced at the DB layer.
// ---------------------------------------------------------------------------
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      app_settings: Table<AppSettingsRow>;
      profiles: Table<ProfileRow>;
      corporates: Table<CorporateRow>;
      corporate_kyc_documents: Table<CorporateKycDocumentRow>;
      vehicles: Table<VehicleRow>;
      vehicle_documents: Table<VehicleDocumentRow>;
      contracts: Table<ContractRow>;
      contract_events: Table<ContractEventRow>;
      service_requests: Table<ServiceRequestRow>;
      service_request_events: Table<ServiceRequestEventRow>;
      invoices: Table<InvoiceRow>;
      invoice_line_items: Table<InvoiceLineItemRow>;
      payments: Table<PaymentRow>;
      notifications_log: Table<NotificationLogRow>;
      audit_log: Table<AuditLogRow>;
      invoice_sequences: Table<{ fiscal_year: string; last_number: number }>;
    };
    // Empty object (not Record<string, never>) so supabase-js's
    // `Tables & Views` intersection doesn't collapse all tables to never.
    Views: Record<never, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRoleEnum };
      current_corporate_id: { Args: Record<string, never>; Returns: string };
      generate_invoice_number: { Args: { issue_date: string }; Returns: string };
      activate_contract: { Args: { p_contract_id: string }; Returns: void };
      terminate_contract: {
        Args: { p_contract_id: string; p_reason: string };
        Returns: void;
      };
      assign_service_request: {
        Args: { p_id: string; p_vendor: string; p_eta?: string | null };
        Returns: void;
      };
      resolve_service_request: {
        Args: { p_id: string; p_note?: string | null };
        Returns: void;
      };
      close_service_request: {
        Args: { p_id: string; p_note?: string | null };
        Returns: void;
      };
      set_service_request_billable: {
        Args: { p_id: string; p_amount: number; p_description: string };
        Returns: void;
      };
      recompute_invoice_totals: { Args: { p_id: string }; Returns: void };
      issue_invoice: { Args: { p_id: string }; Returns: void };
      cancel_invoice: { Args: { p_id: string; p_reason: string }; Returns: void };
    };
    Enums: {
      user_role: UserRoleEnum;
      corporate_status: CorporateStatusEnum;
      vehicle_status: VehicleStatusEnum;
      fuel_type: FuelTypeEnum;
      transmission_type: TransmissionTypeEnum;
      vehicle_doc_type: VehicleDocTypeEnum;
      contract_status: ContractStatusEnum;
      responsibility: ResponsibilityEnum;
      service_category: ServiceCategoryEnum;
      service_urgency: ServiceUrgencyEnum;
      service_status: ServiceStatusEnum;
      invoice_status: InvoiceStatusEnum;
      payment_method: PaymentMethodEnum;
      notification_channel: NotificationChannelEnum;
      notification_status: NotificationStatusEnum;
      audit_action: AuditActionEnum;
    };
    CompositeTypes: Record<never, never>;
  };
};
