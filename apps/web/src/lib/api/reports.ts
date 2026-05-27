import { apiFetchJson } from "./client";

export type ReportCategory = "payroll" | "statutory" | "attendance" | "employee";

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
  category: ReportCategory;
  filters: ReportFilterField[];
};

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

export async function fetchReportsCatalog(
  token: string
): Promise<{ reports: ReportDefinition[] }> {
  return apiFetchJson("/v1/reports/catalog", { method: "GET", token });
}

export async function runReport(
  token: string,
  reportId: string,
  filters: Record<string, string | number>
): Promise<ReportResult> {
  return apiFetchJson<ReportResult>("/v1/reports/run", {
    method: "POST",
    token,
    body: JSON.stringify({ reportId, filters }),
  });
}

export function reportResultToCsv(result: ReportResult): string {
  const headers = result.columns.map((c) => c.label);
  const keys = result.columns.map((c) => c.key);
  const lines = [headers.join(",")];
  for (const row of result.rows) {
    lines.push(
      keys
        .map((k) => {
          const v = row[k];
          if (v == null) return "";
          const s = String(v);
          return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
