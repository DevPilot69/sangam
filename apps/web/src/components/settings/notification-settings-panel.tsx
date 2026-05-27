"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { patchTenantSettings } from "@/lib/api/tenant";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";

export type NotificationPrefs = {
  emailNotifications: boolean;
  payslipEmails: boolean;
  leaveNotifications: boolean;
};

type Props = {
  value: NotificationPrefs;
  onChange: (next: NotificationPrefs) => void;
  showWorkspaceLink?: boolean;
};

export function NotificationSettingsPanel({
  value,
  onChange,
  showWorkspaceLink = false,
}: Props) {
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(Permission["settings:write"]);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => patchTenantSettings(token!, { notifications: value }),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      void qc.invalidateQueries({ queryKey: ["tenant", "workspace"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  return (
    <GlassCard level={2}>
      <h2 className="text-lg font-semibold">Notification preferences</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose which email alerts your organization sends to admins and employees.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.emailNotifications}
            onCheckedChange={(c) => onChange({ ...value, emailNotifications: c === true })}
            disabled={!canWrite}
          />
          Email notifications (system events)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.payslipEmails}
            onCheckedChange={(c) => onChange({ ...value, payslipEmails: c === true })}
            disabled={!canWrite}
          />
          Payslip emails when payroll is locked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.leaveNotifications}
            onCheckedChange={(c) => onChange({ ...value, leaveNotifications: c === true })}
            disabled={!canWrite}
          />
          Leave request alerts to managers
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!canWrite || save.isPending}
          onClick={() => save.mutate()}
        >
          Save preferences
        </Button>
        {showWorkspaceLink ? (
          <Link href="/settings/workspace?tab=notifications" className={buttonVariants({ variant: "secondary" })}>
            All workspace settings
          </Link>
        ) : null}
      </div>
    </GlassCard>
  );
}
