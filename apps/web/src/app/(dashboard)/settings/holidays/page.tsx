"use client";

import { HolidayCalendarManager } from "@/components/organization/holiday-calendar-manager";
import {
  deleteTenantHoliday,
  fetchTenantHolidays,
  upsertTenantHolidays,
} from "@/lib/api/holidays";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function HolidaysPage() {
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(Permission["settings:write"]);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Holiday calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage holidays for your organization. Default holidays set by the platform operator
          apply to every company; you can add or override dates for your team below.
        </p>
      </div>

      <HolidayCalendarManager
        title="Organization calendar"
        description="Employees see the merged calendar (platform defaults plus your entries) in leave and attendance."
        readOnlyPlatformNote="These dates are managed by your platform administrator and apply to all organizations unless you add an organization holiday on the same date."
        api={{
          queryKey: ["tenant", "holidays", token],
          fetch: (year) => fetchTenantHolidays(token, year),
          upsert: (holidays) => upsertTenantHolidays(token, holidays),
          update: () => Promise.resolve(),
          remove: (id) => deleteTenantHoliday(token, id),
          canEditRow: (row) => canWrite && row.source === "tenant",
        }}
      />
    </div>
  );
}
