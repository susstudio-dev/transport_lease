import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// Indian RC format varies; we accept 8-12 alphanumeric chars uppercased.
const regNumberRegex = /^[A-Z0-9]{6,15}$/;

export const vehicleFormSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, 'Registration number is too short.')
    .max(15)
    .regex(regNumberRegex, 'Use letters and digits only (e.g. MH01AB1234).'),
  make: z.string().trim().min(1, 'Make is required.').max(100),
  model: z.string().trim().min(1, 'Model is required.').max(100),
  variant: optionalString,
  year: z
    .number({ invalid_type_error: 'Enter a year.' })
    .int()
    .min(1990, 'Year must be 1990 or later.')
    .max(new Date().getFullYear() + 1, 'Year is in the future.'),
  color: optionalString,
  fuelType: z.enum(['petrol', 'diesel', 'cng', 'electric', 'hybrid']),
  transmission: z.enum(['manual', 'automatic']),
  chassisNo: z.string().trim().min(1, 'Chassis number is required.').max(100),
  engineNo: z.string().trim().min(1, 'Engine number is required.').max(100),
  seatingCapacity: z
    .number({ invalid_type_error: 'Enter a number.' })
    .int()
    .min(2)
    .max(50)
    .optional(),
  purchaseDate: optionalString,
  purchasePrice: z
    .number({ invalid_type_error: 'Enter an amount.' })
    .min(0, 'Must be zero or positive.')
    .optional(),
  status: z.enum(['available', 'leased', 'under_service', 'retired']),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;

export const vehicleDocumentSchema = z.object({
  documentNumber: optionalString,
  issueDate: optionalString,
  expiryDate: z.string().min(1, 'Expiry date is required.'),
});
export type VehicleDocumentInput = z.infer<typeof vehicleDocumentSchema>;
