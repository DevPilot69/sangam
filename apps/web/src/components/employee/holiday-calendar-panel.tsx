"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchMeHolidays } from "@/lib/api/employee-portal";

function formatHolidayDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthGroupLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

type HolidayCalendarPanelProps = {
  token: string;
  initialYear?: number;
  compact?: boolean;
};

export function HolidayCalendarPanel({ token, initialYear, compact }: HolidayCalendarPanelProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

  const holidaysQuery = useQuery({
    queryKey: ["me", "holidays", year, token],
    queryFn: () => fetchMeHolidays(token, year),
    enabled: !!token,
  });

  const grouped = useMemo(() => {
    const list = holidaysQuery.data ?? [];
    const out: { label: string; items: typeof list }[] = [];
    let current = "";
    for (const h of list) {
      const label = monthGroupLabel(h.date);
      if (label !== current) {
        current = label;
        out.push({ label, items: [] });
      }
      out[out.length - 1].items.push(h);
    }
    return out;
  }, [holidaysQuery.data]);

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Holidays your company has published for this year.</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
          >
            ←
          </Button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums">{year}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
          >
            →
          </Button>
        </div>
      </div>

      {holidaysQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading holidays…</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holidays listed for {year}.</p>
      ) : (
        <div className={compact ? "max-h-64 overflow-y-auto pr-1" : "max-h-[28rem] overflow-y-auto pr-1"}>
          <ul className="space-y-4">
            {grouped.map((g) => (
              <li key={g.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                <ul className={compact ? "space-y-1.5" : "space-y-2"}>
                  {g.items.map((h) => (
                    <li
                      key={h.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{h.name}</span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground sm:text-sm">
                        {formatHolidayDate(h.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
