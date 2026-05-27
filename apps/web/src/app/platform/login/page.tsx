"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, platformLogin } from "@/lib/platform/auth-service";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { VetanLogo } from "@/components/vetan-logo";

export default function PlatformLoginPage() {
  const router = useRouter();
  const setUser = usePlatformAuthStore((s) => s.setUser);
  const setToken = usePlatformAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setLoading(true);
    try {
      const { user, token } = await platformLogin(email, password);
      setUser(user);
      setToken(token);
      toast.success("Signed in to platform console");
      router.push("/platform");
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <GlassCard level={4} className="w-full max-w-md" hoverable={false}>
        <div className="mb-6 flex items-center gap-2">
          <VetanLogo />
          <span className="text-sm font-medium text-muted-foreground">Platform console</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">SaaS owner sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-tenant telemetry and workspace administration.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {banner ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {banner}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline hover:text-foreground">
            Tenant workspace login
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
