"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmployeePortalCredentials } from "@/lib/api/password-manager";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: EmployeePortalCredentials | null;
  employeeName?: string;
  onDone?: () => void;
};

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error(`Could not copy ${label}`)
  );
}

export function EmployeeCredentialsDialog({
  open,
  onOpenChange,
  credentials,
  employeeName,
  onDone,
}: Props) {
  if (!credentials) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-4 border-border sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Employee portal credentials</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {employeeName ? (
            <>
              Share these login details with <strong>{employeeName}</strong>. They cannot self-register;
              use the employee portal sign-in page with your workspace slug.
            </>
          ) : (
            "Share these login details with the employee."
          )}
        </p>
        <dl className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Workspace slug</dt>
            <dd className="mt-1 flex items-center justify-between gap-2 font-mono">
              {credentials.workspaceSlug}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => copyText("Workspace slug", credentials.workspaceSlug)}
              >
                <Copy className="size-4" />
              </Button>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Username (company code + employee ID)</dt>
            <dd className="mt-1 flex items-center justify-between gap-2 font-mono font-medium">
              {credentials.username}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => copyText("Username", credentials.username)}
              >
                <Copy className="size-4" />
              </Button>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Default password</dt>
            <dd className="mt-1 flex items-center justify-between gap-2 font-mono font-medium">
              {credentials.defaultPassword}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => copyText("Password", credentials.defaultPassword)}
              >
                <Copy className="size-4" />
              </Button>
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Company code: <span className="font-mono">{credentials.companyCode}</span>. Admins can reset
          this password to the same default from Password manager.
        </p>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onDone?.();
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
