import * as XLSX from "xlsx";

import type {
  ApiEmployeeExportRow,
  ApiEmploymentStatus,
  EmployeeBulkImportRow,
} from "@/lib/api/employees";

const HEADER_MAP: Record<string, keyof EmployeeBulkImportRow | "ignore"> = {
  first_name: "firstName",
  firstname: "firstName",
  given_name: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  surname: "lastName",
  email: "email",
  work_email: "email",
  date_of_joining: "dateOfJoining",
  joining_date: "dateOfJoining",
  doj: "dateOfJoining",
  employee_code: "employeeCode",
  code: "employeeCode",
  emp_code: "employeeCode",
  department_code: "departmentCode",
  dept_code: "departmentCode",
  department: "departmentCode",
  designation_title: "designationTitle",
  designation: "designationTitle",
  job_title: "designationTitle",
  title: "designationTitle",
  ctc_annual: "ctcAnnual",
  ctc: "ctcAnnual",
  annual_ctc: "ctcAnnual",
  salary: "ctcAnnual",
  status: "status",
  pan: "pan",
  bank_account: "bankAccount",
  account_number: "bankAccount",
  ifsc: "ifsc",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function excelSerialToIso(n: number): string | null {
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  const utc = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function cellToString(val: unknown): string {
  if (val == null) return "";
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    const iso = excelSerialToIso(val);
    if (iso) return iso;
  }
  return String(val).trim();
}

function normalizeStatus(raw: string): ApiEmploymentStatus | undefined {
  const u = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const allowed: ApiEmploymentStatus[] = [
    "ACTIVE",
    "ON_LEAVE",
    "NOTICE",
    "INACTIVE",
  ];
  return allowed.includes(u as ApiEmploymentStatus)
    ? (u as ApiEmploymentStatus)
    : undefined;
}

function parseCtc(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return val >= 0 ? val : undefined;
  const n = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function mapRawRow(raw: Record<string, unknown>): Partial<EmployeeBulkImportRow> {
  const acc: Partial<EmployeeBulkImportRow> = {};
  for (const [header, val] of Object.entries(raw)) {
    const key = HEADER_MAP[normalizeHeader(header)];
    if (!key || key === "ignore") continue;
    const s = cellToString(val);
    if (key === "ctcAnnual") {
      const n = parseCtc(val);
      if (n !== undefined) acc.ctcAnnual = n;
      continue;
    }
    if (key === "status") {
      const st = normalizeStatus(s);
      if (st) acc.status = st;
      continue;
    }
    if (s) (acc as Record<string, unknown>)[key] = s;
  }
  return acc;
}

function isCompleteRow(
  r: Partial<EmployeeBulkImportRow>
): r is EmployeeBulkImportRow {
  return Boolean(
    r.firstName?.trim() &&
      r.lastName?.trim() &&
      r.email?.trim() &&
      r.dateOfJoining?.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.dateOfJoining.trim())
  );
}

export async function parseEmployeeImportFile(
  file: File
): Promise<EmployeeBulkImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  const out: EmployeeBulkImportRow[] = [];
  for (const raw of rawRows) {
    const partial = mapRawRow(raw);
    if (!isCompleteRow(partial)) continue;
    const row: EmployeeBulkImportRow = {
      firstName: partial.firstName.trim(),
      lastName: partial.lastName.trim(),
      email: partial.email.trim().toLowerCase(),
      dateOfJoining: partial.dateOfJoining.trim(),
    };
    if (partial.employeeCode?.trim())
      row.employeeCode = partial.employeeCode.trim();
    if (partial.departmentCode?.trim())
      row.departmentCode = partial.departmentCode.trim();
    if (partial.designationTitle?.trim())
      row.designationTitle = partial.designationTitle.trim();
    if (partial.status) row.status = partial.status;
    if (partial.ctcAnnual !== undefined) row.ctcAnnual = partial.ctcAnnual;
    if (partial.pan?.trim()) row.pan = partial.pan.replace(/\s/g, "").toUpperCase();
    if (partial.bankAccount?.trim()) {
      row.bankAccount = partial.bankAccount.replace(/\D/g, "");
    }
    if (partial.ifsc?.trim()) {
      row.ifsc = partial.ifsc.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    }
    out.push(row);
  }
  return out;
}

function csvEscapeCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function employeesToCsv(rows: ApiEmployeeExportRow[]): string {
  const headers = [
    "employee_code",
    "first_name",
    "last_name",
    "email",
    "date_of_joining",
    "status",
    "department_code",
    "department_name",
    "designation_title",
    "ctc_annual",
    "pan",
    "bank_account",
    "ifsc",
    "deactivated_at",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscapeCell(r.employeeCode),
        csvEscapeCell(r.firstName),
        csvEscapeCell(r.lastName),
        csvEscapeCell(r.email),
        csvEscapeCell(r.dateOfJoining),
        csvEscapeCell(r.status),
        csvEscapeCell(r.departmentCode),
        csvEscapeCell(r.departmentName),
        csvEscapeCell(r.designationTitle),
        csvEscapeCell(r.ctcAnnual ?? ""),
        csvEscapeCell(r.pan ?? ""),
        csvEscapeCell(r.bankAccount ?? ""),
        csvEscapeCell(r.ifsc ?? ""),
        csvEscapeCell(r.deactivatedAt ?? ""),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function downloadEmployeesExcel(rows: ApiEmployeeExportRow[]): void {
  const sheetRows = rows.map((r) => ({
    employee_code: r.employeeCode,
    first_name: r.firstName,
    last_name: r.lastName,
    email: r.email,
    date_of_joining: r.dateOfJoining,
    status: r.status,
    department_code: r.departmentCode,
    department_name: r.departmentName,
    designation_title: r.designationTitle,
    ctc_annual: r.ctcAnnual ?? "",
    pan: r.pan ?? "",
    bank_account: r.bankAccount ?? "",
    ifsc: r.ifsc ?? "",
    deactivated_at: r.deactivatedAt ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, `employees-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime: string
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
