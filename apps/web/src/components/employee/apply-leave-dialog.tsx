"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { createMeLeaveRequest, fetchMeLeaveTypes } from "@/lib/api/employee-portal";

export function ApplyLeaveDialog({ token }: { token: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const typesQuery = useQuery({
    queryKey: ["me", "leave-types", token],
    queryFn: () => fetchMeLeaveTypes(token),
    enabled: open && !!token,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createMeLeaveRequest(token, {
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Leave request submitted");
      setOpen(false);
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not submit request"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="w-full shadow-[var(--shadow-brand)]">
            Apply for leave
          </Button>
        }
      />
      <DialogContent className="glass-4 border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="leave-type">Leave type</Label>
            <select
              id="leave-type"
              className="mt-1 flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              <option value="">Select type</option>
              {(typesQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">From</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end">To</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <textarea
              id="reason"
              className="mt-1 flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!leaveTypeId || !startDate || !endDate || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
