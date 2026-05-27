"use client";

import {
  ClipboardList,
  LayoutDashboard,
  Leaf,
  Menu,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/stores/ui-store";

function MobileTabBar() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/employees", label: "Team", icon: Users },
    { href: "/payroll", label: "Payroll", icon: ClipboardList },
    { href: "/leave", label: "Leave", icon: Leaf },
    { href: "/settings/workspace", label: "More", icon: Menu },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-border bg-[var(--surface-sidebar)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-[var(--brand-400)]" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-[10px] px-3 py-1",
                active && "bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)]"
              )}
            >
              <item.icon className="size-5" aria-hidden />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <div className="relative min-h-screen">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar
        className={cn(
          "-translate-x-full lg:translate-x-0",
          mobileNavOpen && "translate-x-0"
        )}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-150",
          sidebarCollapsed ? "lg:pl-[var(--sidebar-width-collapsed)]" : "lg:pl-[var(--sidebar-width)]"
        )}
      >
        <Header />
        <main className="relative z-10 flex-1 px-4 py-6 md:px-[var(--content-padding)] md:py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <MobileTabBar />
      <CommandPalette />
    </div>
  );
}
