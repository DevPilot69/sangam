"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmploymentStatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/auth/permissions";
import { formatCurrency, formatDate, formatEmployeeId } from "@/lib/utils/formatters";
import type { EmployeeRow } from "@/types";
import { cn } from "@/lib/utils";

export function EmployeesTable({ data }: { data: EmployeeRow[] }) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const showSalary = hasPermission(Permission["employees:write"]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(() => {
    const cols: ColumnDef<EmployeeRow>[] = [
      {
        id: "name",
        accessorFn: (r) => `${r.firstName} ${r.lastName}`,
        header: "Name",
        cell: ({ row }) => {
          const e = row.original;
          const initials = `${e.firstName[0]}${e.lastName[0]}`.toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8 border border-border">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/employees/${e.id}`}
                    className="font-medium text-foreground hover:text-[var(--brand-300)]"
                  >
                    {e.firstName} {e.lastName}
                  </Link>
                  {e.deactivatedAt ? (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                      Deactivated
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{e.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "employeeId",
        header: "Employee ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatEmployeeId(String(getValue()))}
          </span>
        ),
      },
      { accessorKey: "department", header: "Department" },
      { accessorKey: "designation", header: "Designation" },
      {
        accessorKey: "dateOfJoining",
        header: "Joined",
        cell: ({ getValue }) => formatDate(String(getValue())),
      },
    ];
    if (showSalary) {
      cols.push({
        accessorKey: "ctc",
        header: () => <span className="w-full text-right">CTC</span>,
        cell: ({ getValue }) => (
          <span className="block text-right font-mono tabular-nums text-foreground">
            {formatCurrency(Number(getValue()))}
          </span>
        ),
      });
    }
    cols.push({
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <EmploymentStatusBadge status={getValue() as EmployeeRow["status"]} size="sm" />,
    });
    return cols;
  }, [showSalary]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search employees…"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm border-border bg-transparent"
        aria-label="Search employees"
      />
      <div className="overflow-x-auto rounded-xl border border-border table-glass">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Employee directory</caption>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      h.column.id === "ctc" && "text-right"
                    )}
                    aria-sort={
                      h.column.getIsSorted() === "asc"
                        ? "ascending"
                        : h.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {h.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1",
                          h.column.getCanSort() && "cursor-pointer hover:text-foreground"
                        )}
                        onClick={h.column.getToggleSortingHandler()}
                        disabled={!h.column.getCanSort()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "cursor-pointer",
                  row.original.deactivatedAt && "opacity-60"
                )}
                onClick={() => router.push(`/employees/${row.original.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/employees/${row.original.id}`);
                }}
                tabIndex={0}
                role="link"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn("px-4 py-3", cell.column.id === "ctc" && "text-right")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Showing{" "}
          <span className="tabular-nums text-foreground">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>{" "}
          of <span className="tabular-nums text-foreground">{table.getFilteredRowModel().rows.length}</span>{" "}
          employees
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
