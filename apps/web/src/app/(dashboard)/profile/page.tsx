"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { fetchTenant } from "@/lib/api/tenant";
import {
  changeAuthPassword,
  fetchSessionUser,
  patchAuthProfile,
} from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function AdminProfilePage() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneAlt, setPhoneAlt] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [pan, setPan] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const userQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: () => fetchSessionUser(token!),
    enabled: !!token,
  });

  const tenantQuery = useQuery({
    queryKey: ["tenant", "profile", token],
    queryFn: () => fetchTenant(token!),
    enabled: !!token,
  });

  useEffect(() => {
    const u = userQuery.data;
    if (!u) return;
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone ?? "");
    setPhoneAlt(u.phoneAlt ?? "");
    setAadhar(u.aadhar ?? "");
    setPan(u.pan ?? "");
  }, [userQuery.data]);

  const savePersonalMutation = useMutation({
    mutationFn: () =>
      patchAuthProfile(token!, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        aadhar: aadhar.trim() || undefined,
        pan: pan.trim().toUpperCase() || undefined,
      }),
    onSuccess: (u) => {
      setUser(u);
      setEditingPersonal(false);
      toast.success("Profile updated");
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const saveContactMutation = useMutation({
    mutationFn: () =>
      patchAuthProfile(token!, {
        phone: phone.trim() || undefined,
        phoneAlt: phoneAlt.trim() || undefined,
      }),
    onSuccess: (u) => {
      setUser(u);
      setEditingContact(false);
      toast.success("Contact details updated");
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changeAuthPassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Password change failed"),
  });

  const user = userQuery.data;
  const tenant = tenantQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your account details and view workspace information.
        </p>
      </div>

      {userQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : user ? (
        <>
          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Personal</h2>}>
            {editingPersonal ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profileName">Full name</Label>
                  <Input
                    id="profileName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="profileEmail">Work email</Label>
                  <Input
                    id="profileEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="profileAadhar">Aadhaar (optional)</Label>
                  <Input
                    id="profileAadhar"
                    value={aadhar}
                    onChange={(e) => setAadhar(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="profilePan">PAN (optional)</Label>
                  <Input
                    id="profilePan"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    maxLength={10}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={savePersonalMutation.isPending}
                    onClick={() => savePersonalMutation.mutate()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingPersonal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{user.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                  {user.aadhar ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Aadhaar</dt>
                      <dd className="font-mono">{user.aadhar}</dd>
                    </div>
                  ) : null}
                  {user.pan ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">PAN</dt>
                      <dd className="font-mono">{user.pan}</dd>
                    </div>
                  ) : null}
                </dl>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setEditingPersonal(true)}
                >
                  Edit personal details
                </Button>
              </>
            )}
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Contact</h2>}>
            {editingContact ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profilePhone">Phone</Label>
                  <Input
                    id="profilePhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="profilePhoneAlt">Alternate phone</Label>
                  <Input
                    id="profilePhoneAlt"
                    value={phoneAlt}
                    onChange={(e) => setPhoneAlt(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={saveContactMutation.isPending}
                    onClick={() => saveContactMutation.mutate()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingContact(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{user.phone ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Alternate</dt>
                    <dd>{user.phoneAlt ?? "—"}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setEditingContact(true)}
                >
                  Edit contact
                </Button>
              </>
            )}
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Organization</h2>}>
            {tenantQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading workspace…</p>
            ) : tenant ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Company</dt>
                  <dd className="font-medium">{tenant.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Workspace slug</dt>
                  <dd className="font-mono text-xs">{tenant.slug}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Company code</dt>
                  <dd className="font-mono">{tenant.companyCode ?? "—"}</dd>
                </div>
                {tenant.legalName ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Legal name</dt>
                    <dd>{tenant.legalName}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            <p className="mt-4 text-xs text-muted-foreground">
              Company code is assigned by Vetan platform admin. Manage departments and holidays in{" "}
              <Link href="/organization" className="text-[var(--brand-500)] underline-offset-2 hover:underline">
                Organization
              </Link>
              .
            </p>
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Security</h2>}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={
                  passwordMutation.isPending ||
                  !currentPassword ||
                  newPassword.length < 8
                }
                onClick={() => passwordMutation.mutate()}
              >
                Change password
              </Button>
            </div>
          </GlassCard>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Workspace settings</h2>}>
            <p className="text-sm text-muted-foreground">
              Payroll rules, notifications, API keys, and other tenant configuration.
            </p>
            <Link
              href="/settings/workspace"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mt-4 inline-flex",
              })}
            >
              Open workspace settings
            </Link>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}
