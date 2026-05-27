/**
 * @sangam/contracts — Zod schemas + shared types for every API surface.
 *
 * Re-export per-module. Populated phase by phase as Nest DTOs are ported.
 *
 *   Phase 1: auth (login, register, verify-email, refresh, etc.)
 *   Phase 2: tenant, employees
 *   Phase 3: payroll, leave, attendance, reports
 *   Phase 4: billing
 *   Phase 5: platform
 */

export * from "./permissions";
export * from "./envelope";
export * as Auth from "./auth";
export * as Tenant from "./tenant";
export * as Employees from "./employees";
export * as Payroll from "./payroll";
export * as Leave from "./leave";
export * as Attendance from "./attendance";
export * as Reports from "./reports";
export * as Billing from "./billing";
export * as Notifications from "./notifications";
export * as Audit from "./audit";
export * as EmployeePortal from "./employee-portal";
export * as Platform from "./platform";
