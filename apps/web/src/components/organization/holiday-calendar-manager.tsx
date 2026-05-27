"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { HolidayRow } from "@/lib/api/holidays";

export type HolidayCalendarApi = {
  queryKey: (string | number)[];
  fetch: (year: number) => Promise<HolidayRow[]>;
  upsert: (holidays: { date: string; name: string }[]) => Promise<unknown>;
  update: (id: string, body: { date?: string; name?: string }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  canEditRow: (row: HolidayRow) => boolean;
};

type HolidayCalendarManagerProps = {
  title: string;
  description: string;
  api: HolidayCalendarApi;
  readOnlyPlatformNote?: string;
};

export function HolidayCalendarManager({
  title,
  description,
  api,
  readOnlyPlatformNote,
}: HolidayCalendarManagerProps) {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [addDate, setAddDate] = useState("");
  const [addName, setAddName] = useState("");

  const holidaysQuery = useQuery({
    queryKey: [...api.queryKey, year],
    queryFn: () => api.fetch(year),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: api.queryKey });

  const addMut = useMutation({
    mutationFn: () => api.upsert([{ date: addDate, name: addName.trim() }]),
    onSuccess: () => {
      toast.success("Holiday saved");
      setAddDate("");
      setAddName("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save holiday"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      toast.success("Holiday removed");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not remove"),
  });

  const rows = holidaysQuery.data ?? [];
  const platformRows = rows.filter((r) => r.source === "platform");
  const tenantRows = rows.filter((r) => r.source === "tenant");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>
            ←
          </Button>
          <span className="min-w-[4rem] text-center font-semibold tabular-nums">{year}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}>
            →
          </Button>
        </div>
      </div>

      <GlassCard level={2} header={<h3 className="text-sm font-semibold">Add holiday</h3>}>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hol-date">Date</Label>
            <Input
              id="hol-date"
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hol-name">Holiday name</Label>
            <Input
              id="hol-name"
              value={addName}
              placeholder="e.g. Republic Day"
              onChange={(e) => setAddName(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={!addDate || !addName.trim() || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          {addMut.isPending ? "Saving…" : "Add to calendar"}
        </Button>
      </GlassCard>

      {readOnlyPlatformNote && platformRows.length > 0 ? (
        <GlassCard level={2} header={<h3 className="text-sm font-semibold">Default holidays (all organizations)</h3>}>
          <p className="mb-3 text-xs text-muted-foreground">{readOnlyPlatformNote}</p>
          <HolidayTable rows={platformRows} canEdit={() => false} onDelete={() => undefined} />
        </GlassCard>
      ) : null}

      <GlassCard
        level={2}
        header={
          <h3 className="text-sm font-semibold">
            {readOnlyPlatformNote ? "Your organization holidays" : "Holidays"}
          </h3>
        }
      >
        {holidaysQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : readOnlyPlatformNote ? (
          tenantRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organization-specific holidays for {year}. Add dates above to override or extend the
              default calendar.
            </p>
          ) : (
            <HolidayTable
              rows={tenantRows}
              canEdit={api.canEditRow}
              onDelete={(id) => {
                if (!window.confirm("Remove this holiday?")) return;
                deleteMut.mutate(id);
              }}
              deleting={deleteMut.isPending}
            />
          )
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays for {year}.</p>
        ) : (
          <HolidayTable
            rows={rows}
            canEdit={api.canEditRow}
            onDelete={(id) => {
              if (!window.confirm("Remove this holiday?")) return;
              deleteMut.mutate(id);
            }}
            deleting={deleteMut.isPending}
          />
        )}
      </GlassCard>
    </div>
  );
}

function HolidayTable({
  rows,
  canEdit,
  onDelete,
  deleting,
}: {
  rows: HolidayRow[];
  canEdit: (row: HolidayRow) => boolean;
  onDelete: (id: string) => void;
  deleting?: boolean;
}) {
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((row) => (
        <li
          key={`${row.source}-${row.id}`}
          className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0"
        >
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.date}
              {row.source === "platform" ? " · Default (all tenants)" : " · Organization"}
            </p>
          </div>
          {canEdit(row) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[var(--danger-text)]"
              disabled={deleting}
              onClick={() => onDelete(row.id)}
            >
              Remove
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
