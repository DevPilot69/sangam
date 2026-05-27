"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { fetchMeProfile, patchMeProfile } from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function EmployeeProfilePage() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneAlt, setPhoneAlt] = useState("");

  const profileQuery = useQuery({
    queryKey: ["me", "profile", token],
    queryFn: () => fetchMeProfile(token!),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: () => patchMeProfile(token!, { phone, phoneAlt }),
    onSuccess: () => {
      toast.success("Contact details updated");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const data = profileQuery.data;
  const user = data?.user;
  const emp = data?.employee;

  function startEdit() {
    setPhone(user?.phone ?? "");
    setPhoneAlt(user?.phoneAlt ?? "");
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Profile</h1>

      {profileQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : emp ? (
        <>
          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Personal</h2>}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{user?.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Employee ID</dt>
                <dd className="font-mono">{emp.employeeCode}</dd>
              </div>
              {emp.pan ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">PAN</dt>
                  <dd className="font-mono">{emp.pan}</dd>
                </div>
              ) : null}
            </dl>
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Employment</h2>}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Company</dt>
                <dd>{data.companyName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Department</dt>
                <dd>{emp.department ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Designation</dt>
                <dd>{emp.designation ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{emp.dateOfJoining}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{emp.status.toLowerCase().replace("_", " ")}</dd>
              </div>
            </dl>
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Contact</h2>}>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phoneAlt">Alternate phone</Label>
                  <Input id="phoneAlt" value={phoneAlt} onChange={(e) => setPhoneAlt(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{user?.phone ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Alternate</dt>
                    <dd>{user?.phoneAlt ?? "—"}</dd>
                  </div>
                </dl>
                <Button type="button" variant="secondary" className="mt-4" onClick={startEdit}>
                  Edit contact
                </Button>
              </>
            )}
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Documents</h2>}>
            <p className="text-sm text-muted-foreground">
              View ID proofs and other files from your onboarding in the document center.
            </p>
            <Link
              href="/employee/documents"
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4 inline-flex" })}
            >
              Open document center
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Tax declarations and Form 16 will appear here when your employer publishes them.
            </p>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}
