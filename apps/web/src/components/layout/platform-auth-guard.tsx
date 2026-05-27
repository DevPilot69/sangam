"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { useIsClient } from "@/lib/hooks/use-is-client";

export function PlatformAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = usePlatformAuthStore((s) => s.user);
  const token = usePlatformAuthStore((s) => s.token);
  const mounted = useIsClient();

  useEffect(() => {
    if (!mounted) return;
    if (!user || !token) {
      router.replace("/platform/login");
    }
  }, [mounted, user, token, router]);

  if (!mounted || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
