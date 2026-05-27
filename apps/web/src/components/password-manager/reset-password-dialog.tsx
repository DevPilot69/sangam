"use client";

import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PasswordManagerAccount } from "@/lib/api/password-manager";

type Props = {
  account: PasswordManagerAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onConfirm: () => Promise<void>;
};

export function ResetPasswordDialog({
  account,
  open,
  onOpenChange,
  saving = false,
  onConfirm,
}: Props) {
  if (!account) return null;

  const title =
    account.accountType === "tenant_admin"
      ? "Reset tenant admin password"
      : "Reset employee password";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-4 border-border sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-[var(--brand-400)]" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-medium">{account.name}</p>
          <p className="text-muted-foreground">Work email: {account.email}</p>
          {account.employeeCode ? (
            <p className="font-mono text-xs text-muted-foreground">{account.employeeCode}</p>
          ) : null}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              After reset
            </p>
            <p>
              <span className="text-muted-foreground">Username: </span>
              <span className="font-mono font-medium">{account.loginUsername ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Password: </span>
              <span className="font-mono font-medium">{account.defaultPassword}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Password will be reset to the organization default ({account.defaultPassword}). Active
            sessions are signed out. This does not require the user&apos;s current password.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose render={<Button type="button" variant="secondary" disabled={saving} />}>
            Cancel
          </DialogClose>
          <Button type="button" disabled={saving} onClick={() => void onConfirm()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Reset to default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
