"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, ApiError } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const [showPw, setShowPw] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: "", email: "", password: "", remember: false },
  });

  useEffect(() => {
    const slug = sessionStorage.getItem("vetan-last-workspace");
    if (slug) form.setValue("tenantSlug", slug);
  }, [form]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("verified") === "1") {
      toast.success("Email verified. Sign in with your workspace slug, login, and password.");
      router.replace("/login");
    }
  }, [router]);

  async function onSubmit(values: LoginValues) {
    setBanner(null);
    try {
      const { user, token } = await login(values.tenantSlug, values.email, values.password);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vetan-last-workspace", values.tenantSlug.trim().toLowerCase());
      }
      setUser(user);
      setToken(token);
      toast.success("Signed in");
      if (user.role === "employee") {
        router.push("/employee/dashboard");
      } else if (!user.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setBanner(e.message);
      } else {
        setBanner("Could not sign in. Check your workspace slug, email, and password.");
      }
    }
  }

  return (
    <GlassCard level={4} className="w-full max-w-[440px] shadow-[var(--shadow-xl)]" hoverable={false}>
      <div className="px-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to your payroll workspace.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4 px-2">
        {banner ? (
          <div
            role="alert"
            className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
          >
            {banner}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="tenantSlug">
            Workspace slug <span className="text-[var(--danger-text)]">*</span>
          </Label>
          <Input
            id="tenantSlug"
            autoComplete="organization"
            placeholder="e.g. acme-india"
            aria-invalid={!!form.formState.errors.tenantSlug}
            aria-describedby={form.formState.errors.tenantSlug ? "slug-err" : undefined}
            {...form.register("tenantSlug")}
          />
          {form.formState.errors.tenantSlug ? (
            <p id="slug-err" className="text-xs text-[var(--danger-text)]">
              ⚠ {form.formState.errors.tenantSlug.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">The URL handle from registration (lowercase, hyphens).</p>
          )}
        </div>

        <div className="space-y-2">
            <Label htmlFor="email">
              Email or username <span className="text-[var(--danger-text)]">*</span>
            </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? "email-err" : undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p id="email-err" className="text-xs text-[var(--danger-text)]">
              ⚠ {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">
              Password <span className="text-[var(--danger-text)]">*</span>
            </Label>
            <Link href="/forgot-password" className="text-xs font-medium text-[var(--brand-300)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              aria-describedby={form.formState.errors.password ? "pw-err" : undefined}
              {...form.register("password")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {form.formState.errors.password ? (
            <p id="pw-err" className="text-xs text-[var(--danger-text)]">
              ⚠ {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={form.watch("remember")}
            onCheckedChange={(c) => form.setValue("remember", c === true)}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            Remember me
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign In"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-[var(--brand-300)] hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/platform/login" className="underline hover:text-foreground">
            Platform owner sign in
          </Link>
          {" · "}
          Use the workspace slug from sign-up.
        </p>
      </form>
    </GlassCard>
  );
}
