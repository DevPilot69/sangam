"use client";

import { HolidayCalendarManager } from "@/components/organization/holiday-calendar-manager";
import {
  deletePlatformHoliday,
  fetchPlatformHolidays,
  upsertPlatformHolidays,
} from "@/lib/api/platform-holidays";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";

export default function PlatformHolidaysPage() {
  const token = usePlatformAuthStore((s) => s.token);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Global holiday calendar
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Holidays you add here apply to every tenant on the platform. Individual organizations can
          still add or override dates in their own workspace settings.
        </p>
      </div>

      <HolidayCalendarManager
        title="Platform-wide holidays"
        description="Shown to all employees unless their organization sets a holiday on the same date."
        api={{
          queryKey: ["platform", "holidays", token],
          fetch: (year) => fetchPlatformHolidays(token, year),
          upsert: (holidays) => upsertPlatformHolidays(token, holidays),
          update: () => Promise.resolve(),
          remove: (id) => deletePlatformHoliday(token, id),
          canEditRow: (row) => row.source === "platform",
        }}
      />
    </div>
  );
}
