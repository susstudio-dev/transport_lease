export type UserRole = 'super_admin' | 'corporate_admin' | 'finance';

export const ALL_ROLES: readonly UserRole[] = [
  'super_admin',
  'corporate_admin',
  'finance',
] as const;

export function isRole(value: unknown): value is UserRole {
  return value === 'super_admin' || value === 'corporate_admin' || value === 'finance';
}

export function hasRole(role: UserRole | null, allowed: readonly UserRole[]): boolean {
  return role !== null && allowed.includes(role);
}

export function defaultLandingFor(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'corporate_admin':
      return '/corporate';
    case 'finance':
      return '/finance';
  }
}
