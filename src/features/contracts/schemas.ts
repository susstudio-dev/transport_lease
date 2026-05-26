import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const contractFormSchema = z.object({
  corporateId: z.string().uuid('Pick a corporate.'),
  vehicleId: z.string().uuid('Pick a vehicle.'),
  tenureMonths: z
    .number({ invalid_type_error: 'Enter the tenure.' })
    .int('Use whole months.')
    .min(1, 'Minimum 1 month.')
    .max(120, 'Maximum 120 months.'),
  startDate: isoDate,
  monthlyRental: z
    .number({ invalid_type_error: 'Enter the monthly rental.' })
    .min(0, 'Must be zero or positive.'),
  securityDeposit: z
    .number({ invalid_type_error: 'Enter the deposit.' })
    .min(0, 'Must be zero or positive.'),
  kmCapPerMonth: z.number().int().min(0).optional(),
  fuelResponsibility: z.enum(['client', 'company']),
  insuranceResponsibility: z.enum(['client', 'company']),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  previousContractId: z.string().uuid().optional(),
});

export type ContractFormInput = z.infer<typeof contractFormSchema>;

export const terminateSchema = z.object({
  reason: z.string().trim().min(3, 'Provide a brief reason.').max(500),
});
export type TerminateInput = z.infer<typeof terminateSchema>;
