"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth/auth-store";
import { employeesRepository } from "@/lib/repositories/employees.repository";
import { payrollRepository } from "@/lib/repositories/payroll.repository";
import { useCommandPaletteStore } from "@/lib/stores/command-palette-store";

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [q, setQ] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const empQuery = useQuery({
    queryKey: ["employees", "palette", token, q],
    queryFn: () =>
      employeesRepository.list(token!, {
        search: q.trim() || undefined,
        pageSize: 8,
        record: "active",
      }),
    enabled: open && !!token,
  });

  const payrollQuery = useQuery({
    queryKey: ["payroll", "palette", token],
    queryFn: () => payrollRepository.listRuns(token!, { limit: 8 }),
    enabled: open && !!token,
  });

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const emp = (empQuery.data?.items ?? [])
      .map((e) => ({
        id: `e-${e.id}`,
        label: `${e.firstName} ${e.lastName}`,
        sub: e.email,
        href: `/employees/${e.id}`,
      }));
    const runs = (payrollQuery.data ?? [])
      .filter((r) => !qq || r.periodLabel.toLowerCase().includes(qq))
      .slice(0, 4)
      .map((r) => ({
        id: `p-${r.id}`,
        label: `Payroll ${r.periodLabel}`,
        sub: r.status,
        href: `/payroll/${r.id}`,
      }));
    return [...emp, ...runs];
  }, [q, empQuery.data, payrollQuery.data]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router, setOpen]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-4 top-[15%] max-w-lg translate-y-0 border-border p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="p-3">
          <Input
            placeholder="Search employees, payroll runs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-border bg-transparent"
            autoFocus
          />
        </div>
        <ul className="max-h-72 overflow-auto border-t border-border px-2 py-2" role="listbox">
          {empQuery.isLoading || payrollQuery.isLoading ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => go(item.href)}
                >
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.sub}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
