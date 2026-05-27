"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { verifyEmail, ApiError } from "@/lib/auth/auth-service";

function VerifyEmailForm() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";
  const tenantSlug = search.get("tenantSlug") ?? "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function setAt(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  async function submit() {
    if (!tenantSlug) {
      toast.error("Missing workspace slug. Open the link from registration or sign in from the login page.");
      return;
    }
    const otp = digits.join("");
    if (otp.length !== 6) {
      toast.error("Enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmail(tenantSlug, email, otp);
      toast.success("Email verified — sign in to continue.");
      router.push("/login?verified=1");
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Verification failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resend() {
    if (cooldown > 0) return;
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
    toast.message("Resend is not wired to email yet — check API logs if DEV_AUTH_VERBOSE is on.");
  }

  return (
    <GlassCard level={4} className="w-full max-w-[440px]" hoverable={false}>
      <div className="px-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Verify email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code sent to <span className="text-foreground">{email || "your inbox"}</span>
          {tenantSlug ? (
            <>
              {" "}
              for workspace <span className="font-mono text-foreground">{tenantSlug}</span>.
            </>
          ) : null}
        </p>
        {!tenantSlug ? (
          <p className="mt-2 text-xs text-[var(--danger-text)]">
            This page needs <code className="rounded bg-muted px-1">tenantSlug</code> in the URL (return to register
            and complete the flow).
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex justify-center gap-2 px-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
            }}
            className="h-12 w-10 rounded-lg border border-border bg-muted/40 text-center font-mono text-lg text-foreground outline-none focus:border-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-500)]/30"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 px-2">
        <Button type="button" className="w-full" disabled={submitting} onClick={submit}>
          {submitting ? "Verifying…" : "Verify & continue"}
        </Button>
        <Button type="button" variant="secondary" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </Button>
      </div>
    </GlassCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <GlassCard level={4} className="w-full max-w-[440px] p-8 text-sm text-muted-foreground">
          Loading…
        </GlassCard>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
