import { prisma } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import type { Reports } from "@sangam/contracts";
import { getReportDefinition, REPORT_CATALOG } from "./reports-catalog";

/**
 * Reports service — ported from src/modules/reports/reports.service.ts.
 *
 * Catalog-driven. Each report is a self-contained query over Postgres with a
 * `{ columns, rows, summary }` shape suitable for tabular rendering on the
 * front-end. Returns are JSON-only; no PDF / CSV generation here (that lives
 * client-side or in dedicated download routes).
 */

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type ReportResult = {
  reportId: string;
  name: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number>;
};

export function catalog() {
  return { reports: REPORT_CATALOG };
}

export async function run(
  tenantId: string,
  dto: Reports.RunReportDto,
): Promise<ReportResult> {
  const def = getReportDefinition(dto.reportId);
  if (!def) throw new NotFoundError("Report not found");

  switch (dto.reportId) {
    case "payroll_register":
      return payrollRegister(tenantId, dto.filters);
    case "payroll_department_summary":
      return payrollDepartmentSummary(tenantId, dto.filters);
    case "bank_disbursement":
      return bankDisbursement(tenantId, dto.filters);
    case "statutory_summary":
      return statutorySummary(tenantId, dto.filters);
    case "attendance_summary":
      return attendanceSummary(tenantId, dto.filters);
    case "leave_utilization":
      return leaveUtilization(tenantId, dto.filters);
    case "employee_master":
      return employeeMaster(tenantId, dto.filters);
    default:
      throw new BadRequestError("Unsupported report");
  }
}

function periodFromFilters(filters: Record<string, string | number>) {
  const periodYear = Number(filters.periodYear);
  const periodMonth = Number(filters.periodMonth);
  if (!periodYear || !periodMonth || periodMonth < 1 || periodMonth > 12) {
    throw new BadRequestError("periodYear and periodMonth are required");
  }
  return { periodYear, periodMonth };
}

type RunWithEntries = {
  id: string;
  status: string;
  entries: Array<{
    gross: { toString(): string };
    deductions: { toString(): string };
    net: { toString(): string };
    employee: {
      employeeCode: string;
      firstName: string;
      lastName: string;
      bankName: string | null;
      bankAccount: string | null;
      ifsc: string | null;
      salaryPaymentMethod: string;
      department: { name: string } | null;
    };
  }>;
};

async function findRunForPeriod(
  tenantId: string,
  periodYear: number,
  periodMonth: number,
): Promise<RunWithEntries | null> {
  return prisma.payrollRun.findUnique({
    where: {
      tenantId_periodYear_periodMonth: {
        tenantId,
        periodYear,
        periodMonth,
      },
    },
    include: {
      entries: {
        include: {
          employee: {
            include: { department: { select: { name: true } } },
          },
        },
      },
    },
  }) as Promise<RunWithEntries | null>;
}

async function payrollRegister(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const { periodYear, periodMonth } = periodFromFilters(filters);
  const run = await findRunForPeriod(tenantId, periodYear, periodMonth);
  const columns: ReportColumn[] = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "employeeName", label: "Name" },
    { key: "department", label: "Department" },
    { key: "gross", label: "Gross", align: "right" },
    { key: "deductions", label: "Deductions", align: "right" },
    { key: "net", label: "Net pay", align: "right" },
  ];
  if (!run?.entries.length) {
    return {
      reportId: "payroll_register",
      name: "Payroll register",
      generatedAt: new Date().toISOString(),
      columns,
      rows: [],
      summary: {
        message: "No locked payroll entries for this period",
      } as never,
    };
  }
  const rows = run.entries.map((e) => ({
    employeeCode: e.employee.employeeCode,
    employeeName: `${e.employee.firstName} ${e.employee.lastName}`.trim(),
    department: e.employee.department?.name ?? "—",
    gross: Number(e.gross),
    deductions: Number(e.deductions),
    net: Number(e.net),
  }));
  const gross = rows.reduce((s, r) => s + Number(r.gross), 0);
  const net = rows.reduce((s, r) => s + Number(r.net), 0);
  return {
    reportId: "payroll_register",
    name: "Payroll register",
    generatedAt: new Date().toISOString(),
    columns,
    rows,
    summary: {
      employees: rows.length,
      totalGross: gross,
      totalNet: net,
      status: run.status,
    },
  };
}

async function payrollDepartmentSummary(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const reg = await payrollRegister(tenantId, filters);
  const byDept = new Map<
    string,
    { count: number; net: number; gross: number }
  >();
  for (const row of reg.rows) {
    const dept = String(row.department ?? "Unassigned");
    const cur = byDept.get(dept) ?? { count: 0, net: 0, gross: 0 };
    cur.count++;
    cur.net += Number(row.net);
    cur.gross += Number(row.gross);
    byDept.set(dept, cur);
  }
  const columns: ReportColumn[] = [
    { key: "department", label: "Department" },
    { key: "headcount", label: "Employees", align: "right" },
    { key: "gross", label: "Gross", align: "right" },
    { key: "net", label: "Net pay", align: "right" },
  ];
  const rows = [...byDept.entries()].map(([department, v]) => ({
    department,
    headcount: v.count,
    gross: v.gross,
    net: v.net,
  }));
  return {
    reportId: "payroll_department_summary",
    name: "Payroll by department",
    generatedAt: new Date().toISOString(),
    columns,
    rows,
  };
}

async function bankDisbursement(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const { periodYear, periodMonth } = periodFromFilters(filters);
  const run = await findRunForPeriod(tenantId, periodYear, periodMonth);
  const columns: ReportColumn[] = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "employeeName", label: "Name" },
    { key: "bankName", label: "Bank name" },
    { key: "bankAccount", label: "Account number" },
    { key: "ifsc", label: "IFSC" },
    { key: "paymentMethod", label: "Payment method" },
    { key: "net", label: "Amount (INR)", align: "right" },
  ];
  const rows =
    run?.entries.map((e) => ({
      employeeCode: e.employee.employeeCode,
      employeeName: `${e.employee.firstName} ${e.employee.lastName}`.trim(),
      bankName: e.employee.bankName ?? "—",
      bankAccount: e.employee.bankAccount ?? "—",
      ifsc: e.employee.ifsc ?? "—",
      paymentMethod: e.employee.salaryPaymentMethod ?? "NEFT",
      net: Number(e.net),
    })) ?? [];
  return {
    reportId: "bank_disbursement",
    name: "Bank disbursement file",
    generatedAt: new Date().toISOString(),
    columns,
    rows,
    summary: { totalAmount: rows.reduce((s, r) => s + Number(r.net), 0) },
  };
}

async function statutorySummary(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const reg = await payrollRegister(tenantId, filters);
  const gross = reg.rows.reduce((s, r) => s + Number(r.gross), 0);
  const deductions = reg.rows.reduce((s, r) => s + Number(r.deductions), 0);
  const pf = Math.round(gross * 0.12);
  const esi = Math.round(gross * 0.0075);
  const pt = reg.rows.length * 200;
  const tds = Math.max(0, deductions - pf - esi - pt);
  const columns: ReportColumn[] = [
    { key: "component", label: "Component" },
    { key: "amount", label: "Amount (INR)", align: "right" },
  ];
  return {
    reportId: "statutory_summary",
    name: "Statutory deductions summary",
    generatedAt: new Date().toISOString(),
    columns,
    rows: [
      { component: "Provident Fund (est. 12%)", amount: pf },
      { component: "ESI (est. 0.75%)", amount: esi },
      { component: "Professional tax (est.)", amount: pt },
      { component: "TDS / other deductions", amount: tds },
      { component: "Total deductions (actual)", amount: deductions },
    ],
    summary: { grossPayroll: gross },
  };
}

async function attendanceSummary(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const { periodYear, periodMonth } = periodFromFilters(filters);
  const start = new Date(periodYear, periodMonth - 1, 1);
  const end = new Date(periodYear, periodMonth, 0, 23, 59, 59, 999);

  const records = await prisma.attendanceRecord.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  const byEmp = new Map<
    string,
    {
      employeeCode: string;
      employeeName: string;
      department: string;
      present: number;
      absent: number;
      late: number;
      wfh: number;
    }
  >();

  for (const r of records) {
    const key = r.employeeId;
    const name = `${r.employee.firstName} ${r.employee.lastName}`.trim();
    const row = byEmp.get(key) ?? {
      employeeCode: r.employee.employeeCode,
      employeeName: name,
      department: r.employee.department?.name ?? "—",
      present: 0,
      absent: 0,
      late: 0,
      wfh: 0,
    };
    const s = r.status.toUpperCase();
    if (s === "PRESENT") row.present++;
    else if (s === "ABSENT") row.absent++;
    else if (s === "LATE") row.late++;
    else if (s === "WFH") row.wfh++;
    byEmp.set(key, row);
  }

  const columns: ReportColumn[] = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "employeeName", label: "Name" },
    { key: "department", label: "Department" },
    { key: "present", label: "Present", align: "right" },
    { key: "absent", label: "Absent", align: "right" },
    { key: "late", label: "Late", align: "right" },
    { key: "wfh", label: "WFH", align: "right" },
  ];

  return {
    reportId: "attendance_summary",
    name: "Attendance summary",
    generatedAt: new Date().toISOString(),
    columns,
    rows: [...byEmp.values()],
    summary: { totalRecords: records.length },
  };
}

async function leaveUtilization(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const year = Number(filters.year);
  if (!year) throw new BadRequestError("year is required");

  const requests = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
      leaveType: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const columns: ReportColumn[] = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "employeeName", label: "Name" },
    { key: "leaveType", label: "Leave type" },
    { key: "startDate", label: "From" },
    { key: "endDate", label: "To" },
    { key: "workingDays", label: "Days", align: "right" },
  ];

  return {
    reportId: "leave_utilization",
    name: "Leave utilization",
    generatedAt: new Date().toISOString(),
    columns,
    rows: requests.map((r) => ({
      employeeCode: r.employee.employeeCode,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
      leaveType: r.leaveType.name,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      workingDays: Number(r.workingDays),
    })),
    summary: {
      approvedRequests: requests.length,
      totalDays: requests.reduce((s, r) => s + Number(r.workingDays), 0),
    },
  };
}

async function employeeMaster(
  tenantId: string,
  filters: Record<string, string | number>,
): Promise<ReportResult> {
  const record = String(filters.record ?? "active");
  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      ...(record === "active" ? { deletedAt: null, status: "ACTIVE" } : {}),
    },
    orderBy: { employeeCode: "asc" },
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
      dateOfJoining: true,
      ctcAnnual: true,
      pan: true,
      bankName: true,
      bankAccount: true,
      ifsc: true,
      salaryPaymentMethod: true,
      department: { select: { name: true } },
      designation: { select: { title: true } },
    },
  });

  const columns: ReportColumn[] = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "employeeName", label: "Name" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "status", label: "Status" },
    { key: "ctcAnnual", label: "CTC (annual)", align: "right" },
    { key: "bankName", label: "Bank name" },
    { key: "bankAccount", label: "Account" },
    { key: "ifsc", label: "IFSC" },
    { key: "paymentMethod", label: "Salary payment" },
    { key: "bankReady", label: "Bank ready" },
    { key: "pan", label: "PAN" },
  ];

  return {
    reportId: "employee_master",
    name: "Employee master",
    generatedAt: new Date().toISOString(),
    columns,
    rows: employees.map((e) => ({
      employeeCode: e.employeeCode,
      employeeName: `${e.firstName} ${e.lastName}`.trim(),
      department: e.department?.name ?? "—",
      designation: e.designation?.title ?? "—",
      status: e.status,
      ctcAnnual: e.ctcAnnual ? Number(e.ctcAnnual) : null,
      bankName: e.bankName ?? "—",
      bankAccount: e.bankAccount ?? "—",
      ifsc: e.ifsc ?? "—",
      paymentMethod: e.salaryPaymentMethod ?? "NEFT",
      bankReady: e.bankName && e.bankAccount && e.ifsc ? "Yes" : "No",
      pan: e.pan ?? "—",
    })),
    summary: { headcount: employees.length },
  };
}
