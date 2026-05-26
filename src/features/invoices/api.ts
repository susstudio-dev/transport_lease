import { supabase } from '@/lib/supabase';
import type { InvoiceLineItemRow, InvoiceRow } from '@/types/database';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceWithRelations,
  ListInvoicesParams,
  ListInvoicesResult,
} from './types';
import type { InvoiceFormInput, LineItemInput } from './schemas';

function decodeInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    corporateId: row.corporate_id,
    contractId: row.contract_id,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    placeOfSupplyStateCode: row.place_of_supply_state_code,
    isInterState: row.is_inter_state,
    subtotal: row.subtotal,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    total: row.total,
    amountPaid: row.amount_paid,
    status: row.status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentLink: row.razorpay_payment_link,
    pdfPath: row.pdf_path,
    notes: row.notes,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function decodeLineItem(row: InvoiceLineItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    hsnCode: row.hsn_code,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    taxableValue: row.taxable_value,
    gstRate: row.gst_rate,
    position: row.position,
  };
}

type JoinedRow = InvoiceRow & {
  corporate: {
    id: string;
    legal_name: string;
    gstin: string | null;
    state_code: string | null;
  } | null;
  contract: { id: string; contract_number: string } | null;
};

function decodeWithRelations(row: JoinedRow): InvoiceWithRelations {
  return {
    ...decodeInvoice(row),
    corporate: row.corporate
      ? {
          id: row.corporate.id,
          legalName: row.corporate.legal_name,
          gstin: row.corporate.gstin,
          stateCode: row.corporate.state_code,
        }
      : null,
    contract: row.contract
      ? { id: row.contract.id, contractNumber: row.contract.contract_number }
      : null,
  };
}

const RELATION_SELECT =
  '*, corporate:corporates(id, legal_name, gstin, state_code), contract:contracts(id, contract_number)';

export async function listInvoices(p: ListInvoicesParams): Promise<ListInvoicesResult> {
  const from = p.page * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from('invoices')
    .select(RELATION_SELECT, { count: 'exact' })
    .order(p.sortBy, { ascending: p.sortDir === 'asc' })
    .range(from, to);

  if (p.search.length > 0) {
    const term = p.search.replace(/[%_]/g, '\\$&');
    q = q.ilike('invoice_number', `%${term}%`);
  }
  if (p.status && p.status !== 'all') q = q.eq('status', p.status);
  if (p.corporateId) q = q.eq('corporate_id', p.corporateId);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r) => decodeWithRelations(r as unknown as JoinedRow));
  if (rows.length === 0 && (count ?? 0) === 0 && p.page === 0 && p.search.length === 0) {
    const demo = demoInvoices();
    const filtered = demo.filter((inv) => {
      if (p.status && p.status !== 'all' && inv.status !== p.status) return false;
      if (p.corporateId && inv.corporateId !== p.corporateId) return false;
      return true;
    });
    return { rows: filtered, total: filtered.length };
  }
  return { rows, total: count ?? 0 };
}

function demoInvoices(): InvoiceWithRelations[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const monthStart = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const monthEnd = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);

  const mk = (i: number, partial: Partial<InvoiceWithRelations>): InvoiceWithRelations => ({
    id: `demo-inv-${i}`,
    invoiceNumber: `INV-2026-${String(40 + i).padStart(4, '0')}`,
    corporateId: 'demo-corp-1',
    contractId: 'demo-ct-1',
    billingPeriodStart: fmt(monthStart(0)),
    billingPeriodEnd: fmt(monthEnd(0)),
    issueDate: fmt(monthStart(0)),
    dueDate: fmt(addDays(monthStart(0), 15)),
    placeOfSupplyStateCode: '29',
    isInterState: false,
    subtotal: '24500.00',
    cgst: '2205.00',
    sgst: '2205.00',
    igst: '0.00',
    total: '28910.00',
    amountPaid: '0.00',
    status: 'issued',
    razorpayOrderId: null,
    razorpayPaymentLink: null,
    pdfPath: null,
    notes: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    corporate: {
      id: 'demo-corp-1',
      legalName: 'Acme Logistics Pvt Ltd',
      gstin: '29AABCA1234C1Z2',
      stateCode: '29',
    },
    contract: { id: 'demo-ct-1', contractNumber: 'CT-2026-0001' },
    ...partial,
  });

  return [
    mk(1, {
      invoiceNumber: 'INV-2026-0041',
      billingPeriodStart: fmt(monthStart(-1)),
      billingPeriodEnd: fmt(monthEnd(-1)),
      issueDate: fmt(monthStart(-1)),
      dueDate: fmt(addDays(monthStart(-1), 15)),
      subtotal: '24500.00',
      cgst: '2205.00',
      sgst: '2205.00',
      total: '28910.00',
      amountPaid: '28910.00',
      status: 'paid',
    }),
    mk(2, {
      invoiceNumber: 'INV-2026-0042',
      corporateId: 'demo-corp-2',
      contractId: 'demo-ct-2',
      subtotal: '28000.00',
      cgst: '2520.00',
      sgst: '2520.00',
      total: '33040.00',
      amountPaid: '0.00',
      status: 'issued',
      dueDate: fmt(addDays(today, 8)),
      corporate: {
        id: 'demo-corp-2',
        legalName: 'BlueWave Transport Pvt Ltd',
        gstin: '29AABCB5678D1Z9',
        stateCode: '29',
      },
      contract: { id: 'demo-ct-2', contractNumber: 'CT-2026-0002' },
    }),
    mk(3, {
      invoiceNumber: 'INV-2026-0039',
      corporateId: 'demo-corp-3',
      contractId: 'demo-ct-3',
      subtotal: '22500.00',
      cgst: '0.00',
      sgst: '0.00',
      igst: '4050.00',
      isInterState: true,
      placeOfSupplyStateCode: '27',
      total: '26550.00',
      amountPaid: '0.00',
      status: 'overdue',
      issueDate: fmt(addDays(today, -40)),
      dueDate: fmt(addDays(today, -25)),
      corporate: {
        id: 'demo-corp-3',
        legalName: 'NorthStar Freight Pvt Ltd',
        gstin: '27AABCN9090E1Z3',
        stateCode: '27',
      },
      contract: { id: 'demo-ct-3', contractNumber: 'CT-2026-0003' },
    }),
  ];
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations> {
  const { data, error } = await supabase
    .from('invoices')
    .select(RELATION_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return decodeWithRelations(data as unknown as JoinedRow);
}

export async function listInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
  const { data, error } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => decodeLineItem(r as InvoiceLineItemRow));
}

// ----- GST split + line item encoding -------------------------------------

function isInterState(
  supplierStateCode: string | null,
  recipientStateCode: string | null,
): boolean {
  if (!supplierStateCode || !recipientStateCode) return false;
  return supplierStateCode !== recipientStateCode;
}

async function determineInterState(corporateId: string): Promise<{
  isInterState: boolean;
  placeOfSupplyStateCode: string | null;
}> {
  const [corpRes, settingsRes] = await Promise.all([
    supabase.from('corporates').select('state_code').eq('id', corporateId).single(),
    supabase.from('app_settings').select('state_code').eq('id', true).single(),
  ]);
  if (corpRes.error) throw corpRes.error;
  if (settingsRes.error) throw settingsRes.error;
  return {
    isInterState: isInterState(settingsRes.data.state_code, corpRes.data.state_code),
    placeOfSupplyStateCode: corpRes.data.state_code,
  };
}

function encodeLine(line: LineItemInput, position: number) {
  const taxable = Number((line.quantity * line.unitPrice).toFixed(2));
  return {
    description: line.description,
    hsn_code: line.hsnCode,
    quantity: line.quantity.toString(),
    unit_price: line.unitPrice.toFixed(2),
    taxable_value: taxable.toFixed(2),
    gst_rate: line.gstRate.toString(),
    position,
  };
}

// ----- Create / update drafts ---------------------------------------------

export async function createInvoiceDraft(
  input: InvoiceFormInput & { corporateId: string },
): Promise<Invoice> {
  const split = await determineInterState(input.corporateId);

  // 1. Generate the next FY-aware invoice number up-front.
  const { data: numberRes, error: numErr } = await supabase.rpc('generate_invoice_number', {
    issue_date: input.billingPeriodStart,
  });
  if (numErr) throw numErr;
  const invoiceNumber = numberRes as unknown as string;

  // 2. Insert the invoice header. Totals are 0 until line items land.
  const { data: inserted, error: insErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      corporate_id: input.corporateId,
      contract_id: input.contractId,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      due_date: input.dueDate,
      place_of_supply_state_code: split.placeOfSupplyStateCode,
      is_inter_state: split.isInterState,
      status: 'draft',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (insErr) throw insErr;

  // 3. Insert line items. The trigger from migration 16 will recompute totals.
  try {
    const lines = input.lineItems.map((l, i) => ({
      invoice_id: inserted.id,
      ...encodeLine(l, i + 1),
    }));
    const { error: lineErr } = await supabase.from('invoice_line_items').insert(lines);
    if (lineErr) throw lineErr;
  } catch (e) {
    // Roll back the parent row so we don't leak orphaned drafts.
    await supabase.from('invoices').delete().eq('id', inserted.id);
    throw e;
  }

  // 4. Read back the recomputed totals.
  const { data: final, error: finErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', inserted.id)
    .single();
  if (finErr) throw finErr;
  return decodeInvoice(final as InvoiceRow);
}

/** Replaces line items and updates header fields. Draft only. */
export async function updateInvoiceDraft(id: string, input: InvoiceFormInput): Promise<Invoice> {
  // Confirm it's still a draft.
  const { data: current, error: getErr } = await supabase
    .from('invoices')
    .select('status, corporate_id')
    .eq('id', id)
    .single();
  if (getErr) throw getErr;
  if (current.status !== 'draft') {
    throw new Error('Only drafts can be edited.');
  }

  const split = await determineInterState(current.corporate_id);

  // 1. Update header.
  const { error: updErr } = await supabase
    .from('invoices')
    .update({
      contract_id: input.contractId,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      due_date: input.dueDate,
      place_of_supply_state_code: split.placeOfSupplyStateCode,
      is_inter_state: split.isInterState,
      notes: input.notes ?? null,
    })
    .eq('id', id);
  if (updErr) throw updErr;

  // 2. Replace line items: delete existing, insert new. The trigger recomputes
  //    totals after the inserts; the delete also triggers a recompute (to 0)
  //    but that's fine — eventual consistency within the transaction.
  const { error: delErr } = await supabase.from('invoice_line_items').delete().eq('invoice_id', id);
  if (delErr) throw delErr;

  const lines = input.lineItems.map((l, i) => ({
    invoice_id: id,
    ...encodeLine(l, i + 1),
  }));
  const { error: insErr } = await supabase.from('invoice_line_items').insert(lines);
  if (insErr) throw insErr;

  const { data: final, error: finErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
  if (finErr) throw finErr;
  return decodeInvoice(final as InvoiceRow);
}

// ----- RPC wrappers --------------------------------------------------------

export async function issueInvoice(id: string): Promise<void> {
  const { error } = await supabase.rpc('issue_invoice', { p_id: id });
  if (error) throw error;
}

export async function cancelInvoice(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_invoice', { p_id: id, p_reason: reason });
  if (error) throw error;
}

export async function deleteDraftInvoice(id: string): Promise<void> {
  // Lines cascade via FK.
  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('status', 'draft');
  if (error) throw error;
}

// ----- Contract picker helper ---------------------------------------------

export type InvoiceableContract = {
  id: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyRental: string;
  corporate: { id: string; legalName: string; stateCode: string | null };
  vehicle: { id: string; registrationNumber: string; make: string; model: string };
};

export async function listInvoiceableContracts(): Promise<InvoiceableContract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, contract_number, start_date, end_date, monthly_rental, status, corporate:corporates(id, legal_name, state_code), vehicle:vehicles(id, registration_number, make, model)',
    )
    .order('start_date', { ascending: false });
  if (error) throw error;

  type Row = {
    id: string;
    contract_number: string;
    start_date: string;
    end_date: string;
    monthly_rental: string;
    corporate: { id: string; legal_name: string; state_code: string | null } | null;
    vehicle: { id: string; registration_number: string; make: string; model: string } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter(
      (
        r,
      ): r is Row & {
        corporate: NonNullable<Row['corporate']>;
        vehicle: NonNullable<Row['vehicle']>;
      } => r.corporate !== null && r.vehicle !== null,
    )
    .map((r) => ({
      id: r.id,
      contractNumber: r.contract_number,
      startDate: r.start_date,
      endDate: r.end_date,
      monthlyRental: r.monthly_rental,
      corporate: {
        id: r.corporate.id,
        legalName: r.corporate.legal_name,
        stateCode: r.corporate.state_code,
      },
      vehicle: {
        id: r.vehicle.id,
        registrationNumber: r.vehicle.registration_number,
        make: r.vehicle.make,
        model: r.vehicle.model,
      },
    }));
}
