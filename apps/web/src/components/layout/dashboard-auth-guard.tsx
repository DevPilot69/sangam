"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SessionProfileSync } from "@/components/auth/session-profile-sync";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useIsClient } from "@/lib/hooks/use-is-client";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const mounted = useIsClient();

  useEffect(() => {
    if (!mounted) return;
    if (!user || !token) {
      router.replace("/login");
      return;
    }
    if (user.role === "employee") {
      router.replace("/employee/dashboard");
      return;
    }
    if (!user.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [mounted, user, token, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user || !token || user.role === "employee" || !user.onboardingComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <>
      <SessionProfileSync />
      {children}
    </>
  );
}
