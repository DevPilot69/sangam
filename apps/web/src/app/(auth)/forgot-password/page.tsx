"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth/auth-service";

export default function ForgotPasswordPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const slug = sessionStorage.getItem("vetan-last-workspace") ?? "";
    if (slug) setTenantSlug(slug);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await forgotPassword(tenantSlug, email);
      setSent(true);
      setCooldown(60);
      const t = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(t);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      toast.error("Could not send reset email. Check workspace slug and email.");
    }
  }

  return (
    <GlassCard level={4} className="w-full max-w-[440px]" hoverable={false}>
      <div className="px-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ll email a reset link.</p>
      </div>
      {sent ? (
        <div className="mt-6 space-y-4 px-2 text-sm text-muted-foreground">
          <p>Check your inbox at {email} for the next steps.</p>
          <Button
            type="button"
            variant="secondary"
            disabled={cooldown > 0}
            onClick={() => setSent(false)}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </Button>
          <p>
            <Link href="/login" className="text-[var(--brand-300)] hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 px-2">
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Workspace slug</Label>
            <Input
              id="tenantSlug"
              required
              placeholder="e.g. acme-india"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
            />
            <p className="text-xs text-muted-foreground">Same slug you use on the sign-in page.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-[var(--brand-300)] hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </GlassCard>
  );
}
