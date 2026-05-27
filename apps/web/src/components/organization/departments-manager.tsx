"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { ApiDepartment } from "@/lib/api/tenant";
import { suggestCodeFromName } from "@/lib/org/suggest-department-code";

export type DepartmentsManagerProps = {
  rows: ApiDepartment[];
  isLoading?: boolean;
  isError?: boolean;
  canWrite?: boolean;
  saving?: boolean;
  onCreate: (body: { name: string; code: string }) => Promise<void>;
  onUpdate: (id: string, body: { name: string; code: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
};

export function DepartmentsManager({
  rows,
  isLoading,
  isError,
  canWrite = true,
  saving = false,
  onCreate,
  onUpdate,
  onDelete,
  compact = false,
}: DepartmentsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDepartment | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setDialogOpen(true);
  };

  const openEdit = (row: ApiDepartment) => {
    setEditing(row);
    setName(row.name);
    setCode(row.code);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  async function handleSave() {
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n) {
      toast.error("Name is required.");
      return;
    }
    if (!c) {
      toast.error("Code is required.");
      return;
    }
    setPending(true);
    try {
      if (editing) {
        await onUpdate(editing.id, { name: n, code: c });
        toast.success("Department updated.");
      } else {
        await onCreate({ name: n, code: c });
        toast.success("Department added.");
      }
      closeDialog();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(row: ApiDepartment) {
    if (!confirm(`Remove department “${row.name}”? This archives it for the workspace.`)) return;
    setPending(true);
    try {
      await onDelete(row.id);
      toast.success("Department removed.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove department");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Departments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define departments for the organization. Codes must be unique and are used in imports and
              reporting.
            </p>
          </div>
          <Button
            type="button"
            className="shadow-[var(--shadow-brand)]"
            disabled={!canWrite}
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Add department
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={!canWrite} onClick={openCreate}>
            <Plus className="size-4" />
            Add department
          </Button>
        </div>
      )}

      <GlassCard level={2} className="overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load departments.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No departments yet. Add your first department to use it in employee profiles and payroll.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.code}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${d.name}`}
                          disabled={!canWrite}
                          onClick={() => openEdit(d)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remove ${d.name}`}
                          disabled={!canWrite || pending || saving}
                          onClick={() => void handleDelete(d)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="glass-4 border-border sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit department" : "Add department"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department name</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!editing) {
                    setCode((prev) => {
                      const fromOldName = suggestCodeFromName(name);
                      if (prev === "" || prev === fromOldName) return suggestCodeFromName(v);
                      return prev;
                    });
                  }
                }}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">Code</Label>
              <Input
                id="dept-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ENG"
                className="font-mono text-xs uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, underscore, or hyphen. Must start with a letter or number.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="secondary" />}>Cancel</DialogClose>
            <Button
              type="button"
              disabled={pending || saving}
              onClick={() => void handleSave()}
            >
              {pending || saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
