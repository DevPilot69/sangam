"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { NotificationCenterPanel } from "@/components/settings/notification-center-panel";
import {
  NotificationSettingsPanel,
  type NotificationPrefs,
} from "@/components/settings/notification-settings-panel";
import { fetchTenant } from "@/lib/api/tenant";
import { useAuthStore } from "@/lib/auth/auth-store";

function readNotifications(settings: Record<string, unknown> | undefined): NotificationPrefs {
  const n = settings?.notifications;
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    return {
      emailNotifications: true,
      payslipEmails: true,
      leaveNotifications: false,
    };
  }
  const o = n as Record<string, unknown>;
  return {
    emailNotifications: o.emailNotifications !== false,
    payslipEmails: o.payslipEmails !== false,
    leaveNotifications: o.leaveNotifications === true,
  };
}

export function NotificationsSettingsClient() {
  const token = useAuthStore((s) => s.token);
  const [notif, setNotif] = useState<NotificationPrefs>({
    emailNotifications: true,
    payslipEmails: true,
    leaveNotifications: false,
  });

  const tenantQuery = useQuery({
    queryKey: ["tenant", "workspace"],
    queryFn: () => fetchTenant(token!),
    enabled: !!token,
  });

  useEffect(() => {
    if (tenantQuery.data?.settings) {
      setNotif(readNotifications(tenantQuery.data.settings as Record<string, unknown>));
    }
  }, [tenantQuery.data]);

  return (
    <div className="space-y-6">
      <NotificationCenterPanel />
      <NotificationSettingsPanel
        value={notif}
        onChange={setNotif}
        showWorkspaceLink
      />
    </div>
  );
}
