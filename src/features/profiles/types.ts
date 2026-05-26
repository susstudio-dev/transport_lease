import type { UserRole } from '@/lib/permissions';

/** Application-level profile shape, decoded from the `profiles` DB row. */
export type Profile = {
  id: string;
  role: UserRole;
  corporateId: string | null;
  fullName: string;
  phone: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
};
