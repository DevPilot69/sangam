/** Tenant JWT roles (platform super admin is separate). */
export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyName: string;
  avatarUrl?: string;
  onboardingComplete: boolean;
  /** Present when signed in via API */
  tenantId?: string;
  tenantSlug?: string;
  /** RBAC codes from backend (e.g. employees:read) */
  permissions?: string[];
  phone?: string;
  phoneAlt?: string;
  aadhar?: string;
  pan?: string;
}

export type EmploymentStatus = "active" | "on_leave" | "notice" | "inactive";

export interface EmployeeRow {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  ctc: number;
  status: EmploymentStatus;
  dateOfJoining: string;
  deactivatedAt?: string | null;
}

export interface PayrollRunRow {
  id: string;
  period: string;
  employeeCount: number;
  grossPay: number;
  status: PayrollRunStatus;
  initiatedBy: string;
  date: string;
}

export type PayrollRunStatus =
  | "draft"
  | "processing"
  | "pending"
  | "approved"
  | "locked"
  | "disbursed"
  | "error";
