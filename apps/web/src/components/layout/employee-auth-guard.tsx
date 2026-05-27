"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { useIsClient } from "@/lib/hooks/use-is-client";

export function EmployeeAuthGuard({ children }: { children: React.ReactNode }) {
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
    if (user.role !== "employee") {
      router.replace("/");
    }
  }, [mounted, user, token, router]);

  if (!mounted || !user || !token || user.role !== "employee") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  return <>{children}</>;
}
