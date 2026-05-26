import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;
const phoneRegex = /^[+0-9\- ]{7,20}$/;

export const corporateFormSchema = z.object({
  legalName: z.string().trim().min(2, 'Legal name is required.').max(255),
  displayName: optionalString,
  gstin: optionalString.refine(
    (v) => v === undefined || gstinRegex.test(v),
    'GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z2).',
  ),
  pan: optionalString.refine(
    (v) => v === undefined || panRegex.test(v),
    'PAN must be 10 characters (e.g. ABCDE1234F).',
  ),
  stateCode: optionalString.refine(
    (v) => v === undefined || /^[0-9]{2}$/.test(v),
    'State code must be a 2-digit number.',
  ),
  primaryContactName: optionalString,
  primaryContactEmail: z
    .string()
    .trim()
    .email('Enter a valid email.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  primaryContactPhone: optionalString.refine(
    (v) => v === undefined || phoneRegex.test(v),
    'Enter a valid phone number.',
  ),
  billingAddress: z.object({
    line1: optionalString,
    line2: optionalString,
    city: optionalString,
    state: optionalString,
    pincode: optionalString.refine(
      (v) => v === undefined || pincodeRegex.test(v),
      'PIN code must be 6 digits.',
    ),
  }),
  status: z.enum(['active', 'inactive']),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CorporateFormInput = z.infer<typeof corporateFormSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  fullName: z.string().trim().min(2, 'Full name is required.').max(255),
  phone: optionalString.refine(
    (v) => v === undefined || phoneRegex.test(v),
    'Enter a valid phone number.',
  ),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
