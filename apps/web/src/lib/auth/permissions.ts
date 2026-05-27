export const Permission = {
  "employees:read": "employees:read",
  "employees:write": "employees:write",
  "payroll:read": "payroll:read",
  "payroll:run": "payroll:run",
  "payroll:approve": "payroll:approve",
  "leave:read": "leave:read",
  "leave:approve": "leave:approve",
  "reports:read": "reports:read",
  "settings:read": "settings:read",
  "settings:write": "settings:write",
  "billing:read": "billing:read",
  "attendance:read": "attendance:read",
  "attendance:write": "attendance:write",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/** Admin has full tenant access; employees use /v1/me/* (no tenant permissions). */
const rolePermissions: Record<string, PermissionKey[]> = {
  admin: Object.values(Permission),
  employee: [],
};

export function permissionsForRole(role: string): PermissionKey[] {
  return rolePermissions[role] ?? rolePermissions.admin;
}
