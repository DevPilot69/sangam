"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Gauge, IndianRupee, Inbox, KeyRound, LogOut, Network, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { VetanLogo } from "@/components/vetan-logo";

const links = [
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/employees", label: "Employees", icon: Users },
  { href: "/platform/organization", label: "Organization", icon: Network },
  { href: "/platform/holidays", label: "Holiday calendar", icon: CalendarDays },
  { href: "/platform/password-manager", label: "Password manager", icon: KeyRound },
  { href: "/platform", label: "Telemetry", icon: Gauge },
  { href: "/platform/billing", label: "Billing & costs", icon: IndianRupee },
  { href: "/platform/inbox", label: "Email inbox (demo)", icon: Inbox },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = usePlatformAuthStore((s) => s.user);
  const clearAuth = usePlatformAuthStore((s) => s.clearAuth);

  return (
    <aside className="glass-2 flex w-56 shrink-0 flex-col border-r border-border">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <VetanLogo />
        <span className="text-xs font-medium text-muted-foreground">Platform</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/platform" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--brand-500)]/15 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          onClick={() => {
            clearAuth();
            router.push("/platform/login");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
