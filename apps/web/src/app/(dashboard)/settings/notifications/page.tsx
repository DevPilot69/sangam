import { NotificationsSettingsClient } from "./notifications-settings-client";

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View alerts and configure email preferences for your organization.
        </p>
      </div>
      <NotificationsSettingsClient />
    </div>
  );
}
