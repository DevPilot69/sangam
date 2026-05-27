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
import type { ApiDepartment, ApiDesignation } from "@/lib/api/tenant";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function deptName(map: Map<string, ApiDepartment>, id: string | null): string {
  if (!id) return "—";
  return map.get(id)?.name ?? id.slice(0, 8);
}

export type DesignationsManagerProps = {
  rows: ApiDesignation[];
  departments: ApiDepartment[];
  isLoading?: boolean;
  isError?: boolean;
  canWrite?: boolean;
  saving?: boolean;
  onCreate: (body: { title: string; grade?: string; departmentId?: string }) => Promise<void>;
  onUpdate: (
    id: string,
    body: { title: string; grade: string | null; departmentId: string | null }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
};

export function DesignationsManager({
  rows,
  departments,
  isLoading,
  isError,
  canWrite = true,
  saving = false,
  onCreate,
  onUpdate,
  onDelete,
  compact = false,
}: DesignationsManagerProps) {
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDesignation | null>(null);
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [pending, setPending] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setGrade("");
    setDepartmentId("");
    setDialogOpen(true);
  };

  const openEdit = (row: ApiDesignation) => {
    setEditing(row);
    setTitle(row.title);
    setGrade(row.grade ?? "");
    setDepartmentId(row.departmentId ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  async function handleSave() {
    const t = title.trim();
    if (!t) {
      toast.error("Title is required.");
      return;
    }
    const g = grade.trim();
    const dept = departmentId || null;
    setPending(true);
    try {
      if (editing) {
        await onUpdate(editing.id, {
          title: t,
          grade: g === "" ? null : g,
          departmentId: dept,
        });
        toast.success("Designation updated.");
      } else {
        await onCreate({
          title: t,
          grade: g || undefined,
          departmentId: dept ?? undefined,
        });
        toast.success("Designation added.");
      }
      closeDialog();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(row: ApiDesignation) {
    if (!confirm(`Remove designation “${row.title}”?`)) return;
    setPending(true);
    try {
      await onDelete(row.id);
      toast.success("Designation removed.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove designation");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Designations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Job titles and grades used across employee records. Optionally link each title to a
              department.
            </p>
          </div>
          <Button
            type="button"
            className="shadow-[var(--shadow-brand)]"
            disabled={!canWrite}
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Add designation
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={!canWrite} onClick={openCreate}>
            <Plus className="size-4" />
            Add designation
          </Button>
        </div>
      )}

      <GlassCard level={2} className="overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load designations.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No designations yet. Add titles (for example “Software Engineer”, “HR Manager”) to assign
            them to employees.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.grade ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {deptName(deptMap, d.departmentId)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${d.title}`}
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
                          aria-label={`Remove ${d.title}`}
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
            <DialogTitle>{editing ? "Edit designation" : "Add designation"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="des-title">Title</Label>
              <Input
                id="des-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="des-grade">Grade (optional)</Label>
              <Input
                id="des-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. L5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="des-dept">Department (optional)</Label>
              <select
                id="des-dept"
                className={cn(SELECT_CLASS)}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!departments.length}
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              {!departments.length ? (
                <p className="text-xs text-muted-foreground">
                  Add a department first to link this designation to a team.
                </p>
              ) : null}
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
