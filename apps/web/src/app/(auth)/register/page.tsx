"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerApi, ApiError } from "@/lib/auth/auth-service";
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";

function strengthLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      password: "",
      confirm: "",
      terms: false,
    },
  });

  const pw = form.watch("password") ?? "";
  const strength = useMemo(() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }, [pw]);

  async function onSubmit(values: RegisterValues) {
    try {
      const { tenantSlug } = await registerApi(values);
      router.push(
        `/verify-email?email=${encodeURIComponent(values.email)}&tenantSlug=${encodeURIComponent(tenantSlug)}`
      );
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Could not create account.");
      }
    }
  }

  return (
    <GlassCard level={4} className="w-full max-w-[480px] shadow-[var(--shadow-xl)]" hoverable={false}>
      <div className="px-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Start your tenant in minutes.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4 px-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name *</Label>
            <Input id="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} />
            {form.formState.errors.name ? (
              <p className="text-xs text-[var(--danger-text)]">⚠ {form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company *</Label>
            <Input id="companyName" {...form.register("companyName")} />
            {form.formState.errors.companyName ? (
              <p className="text-xs text-[var(--danger-text)]">
                ⚠ {form.formState.errors.companyName.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email *</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-xs text-[var(--danger-text)]">⚠ {form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              {...form.register("password")}
              aria-describedby="pw-rules"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <p id="pw-rules" className="text-xs text-muted-foreground">
            Uppercase, number, special character, 8+ chars.
          </p>
          <div className="flex gap-1 pt-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="h-1 flex-1 rounded-full bg-muted"
                style={{
                  backgroundColor:
                    strength >= step ? "var(--accent-500)" : "var(--border-default)",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{strengthLabel(strength)}</p>
          {form.formState.errors.password ? (
            <p className="text-xs text-[var(--danger-text)]">⚠ {form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password *</Label>
          <Input id="confirm" type="password" {...form.register("confirm")} />
          {form.formState.errors.confirm ? (
            <p className="text-xs text-[var(--danger-text)]">⚠ {form.formState.errors.confirm.message}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            checked={form.watch("terms")}
            onCheckedChange={(c) => form.setValue("terms", c === true)}
          />
          <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
            I agree to the Terms of Service and Privacy Policy.
          </Label>
        </div>
        {form.formState.errors.terms ? (
          <p className="text-xs text-[var(--danger-text)]">⚠ {form.formState.errors.terms.message}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-300)] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </GlassCard>
  );
}
