"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EmployeesTable } from "@/components/tables/employees-table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  bulkImportEmployees,
  fetchEmployees,
  fetchEmployeesExport,
} from "@/lib/api/employees";
import { fetchDepartments, fetchDesignations } from "@/lib/api/tenant";
import {
  downloadEmployeesExcel,
  downloadTextFile,
  employeesToCsv,
  parseEmployeeImportFile,
} from "@/lib/employees/spreadsheet";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type {
  ApiEmploymentStatus,
  ApiEmployeeListItem,
  EmployeeListParams,
  EmployeeRecordScope,
} from "@/lib/api/employees";
import { apiEmployeeToRow } from "@/lib/mappers/employee.mapper";
import type { EmployeeRow, EmploymentStatus } from "@/types";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

type EmployeeFiltersState = {
  record: EmployeeRecordScope;
  status: ApiEmploymentStatus | "";
  departmentId: string;
  designationId: string;
  dateOfJoiningFrom: string;
  dateOfJoiningTo: string;
};

const DEFAULT_FILTERS: EmployeeFiltersState = {
  record: "active",
  status: "",
  departmentId: "",
  designationId: "",
  dateOfJoiningFrom: "",
  dateOfJoiningTo: "",
};

function buildEmployeeListParams(
  deferredSearch: string,
  filters: EmployeeFiltersState
): EmployeeListParams {
  return {
    page: 1,
    pageSize: 100,
    search: deferredSearch.trim() || undefined,
    record: filters.record,
    status: filters.status || undefined,
    departmentId: filters.departmentId.trim() || undefined,
    designationId: filters.designationId.trim() || undefined,
    dateOfJoiningFrom: filters.dateOfJoiningFrom.trim() || undefined,
    dateOfJoiningTo: filters.dateOfJoiningTo.trim() || undefined,
  };
}

function filtersAreDefault(f: EmployeeFiltersState): boolean {
  return (
    f.record === DEFAULT_FILTERS.record &&
    f.status === DEFAULT_FILTERS.status &&
    f.departmentId === DEFAULT_FILTERS.departmentId &&
    f.designationId === DEFAULT_FILTERS.designationId &&
    f.dateOfJoiningFrom === DEFAULT_FILTERS.dateOfJoiningFrom &&
    f.dateOfJoiningTo === DEFAULT_FILTERS.dateOfJoiningTo
  );
}

export default function EmployeesPage() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(Permission["employees:read"]);
  const canWrite = hasPermission(Permission["employees:write"]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<EmployeeFiltersState>(DEFAULT_FILTERS);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const listParams = useMemo(
    () => buildEmployeeListParams(deferredSearch, filters),
    [deferredSearch, filters]
  );

  const deptsQuery = useQuery({
    queryKey: ["tenant", "departments", token],
    enabled: Boolean(token) && canRead,
    queryFn: () => fetchDepartments(token!),
  });
  const desigsQuery = useQuery({
    queryKey: ["tenant", "designations", token],
    enabled: Boolean(token) && canRead,
    queryFn: () => fetchDesignations(token!),
  });

  const query = useQuery({
    queryKey: ["employees", token, listParams],
    enabled: Boolean(token) && canRead,
    queryFn: () => fetchEmployees(token!, listParams),
  });

  const rows = useMemo(() => query.data?.items.map(apiEmployeeToRow) ?? [], [query.data]);

  const runExportCsv = async () => {
    if (!token) return;
    setExportBusy(true);
    try {
      const data = await fetchEmployeesExport(token, listParams);
      const csv = employeesToCsv(data);
      const day = new Date().toISOString().slice(0, 10);
      downloadTextFile(csv, `employees-export-${day}.csv`, "text/csv;charset=utf-8");
      toast.success(`Exported ${data.length} employees to CSV`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const runExportExcel = async () => {
    if (!token) return;
    setExportBusy(true);
    try {
      const data = await fetchEmployeesExport(token, listParams);
      downloadEmployeesExcel(data);
      toast.success(`Exported ${data.length} employees to Excel`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setImportBusy(true);
    try {
      const parsed = await parseEmployeeImportFile(file);
      if (parsed.length === 0) {
        toast.error(
          "No importable rows. Required columns: first name, last name, email, date of joining (YYYY-MM-DD)."
        );
        return;
      }
      const batch = parsed.slice(0, 500);
      if (parsed.length > 500) {
        toast.message(`Only the first 500 of ${parsed.length} rows will be imported.`);
      }
      const res = await bulkImportEmployees(token, batch);
      if (res.created > 0) {
        toast.success(`Created ${res.created} employee${res.created === 1 ? "" : "s"}`);
      }
      if (res.failed.length > 0) {
        const preview = res.failed
          .slice(0, 3)
          .map((f) => `Row ${f.index + 1}: ${f.message}`)
          .join(" · ");
        toast.error(
          `${res.failed.length} row${res.failed.length === 1 ? "" : "s"} failed. ${preview}${res.failed.length > 3 ? "…" : ""}`
        );
      }
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveNarrowing =
    !filtersAreDefault(filters) || deferredSearch.trim().length > 0;

  if (!canRead) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">You don&apos;t have access to the employee directory.</p>
      </GlassCard>
    );
  }

  if (!token) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Sign in to load employees.</p>
        <Link href="/login" className={buttonVariants({ className: "mt-4" })}>
          Sign in
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        aria-hidden
        onChange={onImportFile}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directory, CSV/Excel import, and export from your Vetan workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <>
              <Link href="/employees/new" className={buttonVariants({ className: "shadow-[var(--shadow-brand)]" })}>
                Add employee
              </Link>
              <Button
                type="button"
                variant="secondary"
                disabled={importBusy}
                onClick={() => importInputRef.current?.click()}
              >
                <Download className="mr-2 size-4" />
                {importBusy ? "Importing…" : "Import CSV / Excel"}
              </Button>
            </>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: "outline" })}
              disabled={exportBusy || !canRead}
            >
              <Upload className="mr-2 size-4" />
              {exportBusy ? "Exporting…" : "Export"}
              <ChevronDown className="ml-2 size-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-3 w-48 border-border">
              <DropdownMenuItem
                disabled={exportBusy}
                onClick={() => {
                  void runExportCsv();
                }}
              >
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportBusy}
                onClick={() => {
                  void runExportExcel();
                }}
              >
                Download Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <GlassCard level={2}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <Label htmlFor="emp-search">Search</Label>
                <Input
                  id="emp-search"
                  placeholder="Name, email, or employee code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-record">Record scope</Label>
                <select
                  id="emp-record"
                  className={SELECT_CLASS}
                  value={filters.record}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, record: e.target.value as EmployeeRecordScope }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated only</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-status">Employment status</Label>
                <select
                  id="emp-status"
                  className={SELECT_CLASS}
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: (e.target.value || "") as ApiEmploymentStatus | "",
                    }))
                  }
                >
                  <option value="">Any</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On leave</option>
                  <option value="NOTICE">Notice</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-dept">Department</Label>
                <select
                  id="emp-dept"
                  className={SELECT_CLASS}
                  value={filters.departmentId}
                  onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
                >
                  <option value="">Any</option>
                  {(deptsQuery.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-des">Designation</Label>
                <select
                  id="emp-des"
                  className={SELECT_CLASS}
                  value={filters.designationId}
                  onChange={(e) => setFilters((f) => ({ ...f, designationId: e.target.value }))}
                >
                  <option value="">Any</option>
                  {(desigsQuery.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-doj-from">Date of joining from</Label>
                <Input
                  id="emp-doj-from"
                  type="date"
                  value={filters.dateOfJoiningFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateOfJoiningFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-doj-to">Date of joining to</Label>
                <Input
                  id="emp-doj-to"
                  type="date"
                  value={filters.dateOfJoiningTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateOfJoiningTo: e.target.value }))}
                />
              </div>
            </div>
            <Button type="button" variant="outline" className="shrink-0 self-start lg:self-end" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      </GlassCard>

      {query.isLoading ? (
        <GlassCard level={2}>
          <p className="text-sm text-muted-foreground">Loading employees…</p>
        </GlassCard>
      ) : query.isError ? (
        <GlassCard level={2}>
          <p className="text-sm text-[var(--danger-text)]">
            {query.error instanceof ApiError ? query.error.message : "Could not load employees."}
          </p>
        </GlassCard>
      ) : rows.length === 0 ? (
        hasActiveNarrowing ? (
          <EmptyState
            title="No employees match"
            description="Try widening your search or filters to see more results."
            action={{ label: "Reset filters", onClick: resetFilters }}
          />
        ) : (
          <EmptyState variant="employees" action={{ label: "Add first employee", href: "/employees/new" }} />
        )
      ) : (
        <GlassCard level={2}>
          <EmployeesTable data={rows} />
        </GlassCard>
      )}
    </div>
  );
}
