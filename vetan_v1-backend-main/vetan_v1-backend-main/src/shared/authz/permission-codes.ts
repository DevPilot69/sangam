/** Canonical tenant permission codes (must match prisma/seed.ts). */
export const PERMISSION_CODES = [
  'employees:read',
  'employees:write',
  'payroll:read',
  'payroll:run',
  'payroll:approve',
  'leave:read',
  'leave:approve',
  'reports:read',
  'settings:read',
  'settings:write',
  'billing:read',
  'attendance:read',
  'attendance:write',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
