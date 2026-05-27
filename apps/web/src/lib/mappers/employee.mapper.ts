import type { ApiEmployeeListItem, ApiEmploymentStatus } from "@/lib/api/employees";
import type { EmployeeRow, EmploymentStatus } from "@/types";

const STATUS_FROM_API: Record<ApiEmploymentStatus, EmploymentStatus> = {
  ACTIVE: "active",
  ON_LEAVE: "on_leave",
  NOTICE: "notice",
  INACTIVE: "inactive",
};

export function mapEmploymentStatus(s: ApiEmploymentStatus): EmploymentStatus {
  return STATUS_FROM_API[s] ?? "active";
}

/** Map API list item → table/UI row (single source for display shape). */
export function apiEmployeeToRow(e: ApiEmployeeListItem): EmployeeRow {
  return {
    id: e.id,
    employeeId: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    department: e.departmentName ?? "—",
    designation: e.designationTitle ?? "—",
    ctc: e.ctcAnnual ?? 0,
    status: mapEmploymentStatus(e.status),
    dateOfJoining: e.dateOfJoining,
    deactivatedAt: e.deactivatedAt,
  };
}

export function apiEmployeesToRows(items: ApiEmployeeListItem[]): EmployeeRow[] {
  return items.map(apiEmployeeToRow);
}
