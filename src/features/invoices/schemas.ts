import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required.').max(255),
  hsnCode: z
    .string()
    .trim()
    .min(4, 'HSN/SAC must be at least 4 digits.')
    .max(8)
    .regex(/^[0-9]+$/, 'HSN/SAC must be digits only.'),
  quantity: z.number({ invalid_type_error: 'Enter a quantity.' }).positive('Must be > 0'),
  unitPrice: z.number({ invalid_type_error: 'Enter a unit price.' }).min(0, 'Must be ≥ 0'),
  gstRate: z
    .number({ invalid_type_error: 'Enter the GST rate.' })
    .min(0)
    .max(28, 'GST rate cannot exceed 28%.'),
});
export type LineItemInput = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  contractId: z.string().uuid('Pick a contract.'),
  billingPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  billingPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required.'),
});
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3, 'Provide a brief reason.').max(500),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
