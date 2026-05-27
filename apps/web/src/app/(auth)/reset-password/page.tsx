"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth/auth-service";

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    await resetPassword(token, pw);
    toast.success("Password updated");
    router.push("/login");
  }

  return (
    <GlassCard level={4} className="w-full max-w-[440px]" hoverable={false}>
      <div className="px-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4 px-2">
        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Update password
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-[var(--brand-300)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </GlassCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<GlassCard level={4} className="w-full max-w-[440px] p-8 text-sm text-muted-foreground">Loading…</GlassCard>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
