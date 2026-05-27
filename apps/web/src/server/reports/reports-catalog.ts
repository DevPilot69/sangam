/**
 * Reports catalog — ported from src/modules/reports/reports-catalog.ts
 * (NestJS). Defines the list of available report ids and their filter
 * specifications. Same shape the front-end's
 * `apps/web/src/lib/api/reports.ts` consumes.
 */

export type ReportFilterField = {
  key: string;
  label: string;
  type: "month" | "year" | "select" | "text";
  required?: boolean;
  options?: { value: string; label: string }[];
};

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: "payroll" | "statutory" | "attendance" | "employee";
  filters: ReportFilterField[];
};

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    id: "payroll_register",
    name: "Payroll register",
    description:
      "Employee-wise gross, deductions, and net pay for a payroll run or month.",
    category: "payroll",
    filters: [
      { key: "periodYear", label: "Year", type: "year", required: true },
      { key: "periodMonth", label: "Month", type: "month", required: true },
    ],
  },
  {
    id: "payroll_department_summary",
    name: "Payroll by department",
    description: "Roll-up of net pay and headcount by department for a period.",
    category: "payroll",
    filters: [
      { key: "periodYear", label: "Year", type: "year", required: true },
      { key: "periodMonth", label: "Month", type: "month", required: true },
    ],
  },
  {
    id: "bank_disbursement",
    name: "Bank disbursement file",
    description:
      "Included employees with bank account, IFSC, and net pay (ready for NEFT).",
    category: "payroll",
    filters: [
      { key: "periodYear", label: "Year", type: "year", required: true },
      { key: "periodMonth", label: "Month", type: "month", required: true },
    ],
  },
  {
    id: "statutory_summary",
    name: "Statutory deductions summary",
    description:
      "Estimated PF, ESI, PT, and TDS totals for the selected payroll period.",
    category: "statutory",
    filters: [
      { key: "periodYear", label: "Year", type: "year", required: true },
      { key: "periodMonth", label: "Month", type: "month", required: true },
    ],
  },
  {
    id: "attendance_summary",
    name: "Attendance summary",
    description:
      "Present, absent, late, and WFH counts by employee for a month.",
    category: "attendance",
    filters: [
      { key: "periodYear", label: "Year", type: "year", required: true },
      { key: "periodMonth", label: "Month", type: "month", required: true },
    ],
  },
  {
    id: "leave_utilization",
    name: "Leave utilization",
    description:
      "Approved leave days by employee and leave type for the calendar year.",
    category: "attendance",
    filters: [{ key: "year", label: "Year", type: "year", required: true }],
  },
  {
    id: "employee_master",
    name: "Employee master",
    description:
      "Active workforce listing with department, compensation, and bank readiness.",
    category: "employee",
    filters: [
      {
        key: "record",
        label: "Records",
        type: "select",
        required: true,
        options: [
          { value: "active", label: "Active only" },
          { value: "all", label: "All (incl. deactivated)" },
        ],
      },
    ],
  },
];

export function getReportDefinition(id: string): ReportDefinition | undefined {
  return REPORT_CATALOG.find((r) => r.id === id);
}
