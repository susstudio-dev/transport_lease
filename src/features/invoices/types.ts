import type { InvoiceStatusEnum } from '@/types/database';

export type Invoice = {
  id: string;
  invoiceNumber: string;
  corporateId: string;
  contractId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  placeOfSupplyStateCode: string | null;
  isInterState: boolean;
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  amountPaid: string;
  status: InvoiceStatusEnum;
  razorpayOrderId: string | null;
  razorpayPaymentLink: string | null;
  pdfPath: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  description: string;
  hsnCode: string;
  quantity: string;
  unitPrice: string;
  taxableValue: string;
  gstRate: string;
  position: number;
};

export type InvoiceWithRelations = Invoice & {
  corporate: {
    id: string;
    legalName: string;
    gstin: string | null;
    stateCode: string | null;
  } | null;
  contract: {
    id: string;
    contractNumber: string;
  } | null;
};

export type ListInvoicesParams = {
  page: number;
  pageSize: number;
  search: string;
  status?: InvoiceStatusEnum | 'all';
  corporateId?: string | null;
  sortBy: 'invoice_number' | 'issue_date' | 'due_date' | 'total' | 'status';
  sortDir: 'asc' | 'desc';
};

export type ListInvoicesResult = {
  rows: InvoiceWithRelations[];
  total: number;
};
