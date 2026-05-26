import { z } from 'zod';

export const newServiceRequestSchema = z.object({
  contractId: z.string().uuid('Pick a vehicle.'),
  vehicleId: z.string().uuid(),
  category: z.enum(['servicing', 'breakdown', 'accident', 'replacement', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(10, 'Describe the issue in at least 10 characters.').max(2000),
});
export type NewServiceRequestInput = z.infer<typeof newServiceRequestSchema>;

export const assignVendorSchema = z.object({
  vendor: z.string().trim().min(2, 'Vendor name is required.').max(120),
  vendorEta: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type AssignVendorInput = z.infer<typeof assignVendorSchema>;

export const statusNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type StatusNoteInput = z.infer<typeof statusNoteSchema>;

export const billableSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter an amount.' }).min(0, 'Must be zero or positive.'),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type BillableInput = z.infer<typeof billableSchema>;
