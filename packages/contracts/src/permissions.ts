/**
 * Canonical tenant permission codes. Single source of truth for both the API
 * (api-kit's requireAuth(perms?) guard) and the frontend (UI gating in
 * `apps/web/src/lib/hooks/use-permissions.ts`). Must match prisma/seed.ts.
 *
 * Ported verbatim from
 *   vetan_v1-backend-main/src/shared/authz/permission-codes.ts
 */
export const PERMISSION_CODES = [
  "employees:read",
  "employees:write",
  "payroll:read",
  "payroll:run",
  "payroll:approve",
  "leave:read",
  "leave:approve",
  "reports:read",
  "settings:read",
  "settings:write",
  "billing:read",
  "attendance:read",
  "attendance:write",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
