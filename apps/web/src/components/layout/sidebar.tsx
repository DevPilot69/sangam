"use client";

import {
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  KeyRound,
  LayoutDashboard,
  Leaf,
  LogOut,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { VetanLogo } from "@/components/vetan-logo";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { logout } from "@/lib/auth/auth-service";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: (typeof Permission)[keyof typeof Permission];
};

const main: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users, perm: Permission["employees:read"] },
  {
    href: "/organization",
    label: "Organization",
    icon: Network,
    perm: Permission["settings:read"],
  },
  {
    href: "/password-manager",
    label: "Password manager",
    icon: KeyRound,
    perm: Permission["settings:read"],
  },
  { href: "/billing", label: "Billing", icon: CreditCard, perm: Permission["billing:read"] },
  { href: "/attendance", label: "Attendance", icon: CalendarDays, perm: Permission["attendance:read"] },
  { href: "/leave", label: "Leave", icon: Leaf, perm: Permission["leave:read"] },
];

const finances: NavItem[] = [
  { href: "/payroll", label: "Payroll", icon: ClipboardList, perm: Permission["payroll:read"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, perm: Permission["reports:read"] },
];

const settings: NavItem[] = [
  { href: "/settings/workspace", label: "Workspace", icon: Settings, perm: Permission["settings:read"] },
  { href: "/settings/holidays", label: "Holiday calendar", icon: CalendarDays, perm: Permission["settings:read"] },
  { href: "/audit-logs", label: "Audit logs", icon: ScrollText, perm: Permission["settings:read"] },
];

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  const visible = items.filter((i) => !i.perm || hasPermission(i.perm));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6">
      {!collapsed ? (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {visible.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors animate-nav-activate",
                  active
                    ? "bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-foreground shadow-[inset_3px_0_0_var(--brand-500)]"
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="size-[18px] shrink-0 text-[var(--brand-400)]" aria-hidden />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const { sidebarCollapsed, setSidebarCollapsed } = useUiStore();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "V";

  return (
    <aside
      className={cn(
        "glass-1 fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border py-4 transition-[width,transform] duration-150 ease-out",
        sidebarCollapsed ? "w-[var(--sidebar-width-collapsed)] px-2" : "w-[var(--sidebar-width)] px-3",
        className
      )}
    >
      <div className={cn("mb-6 flex items-center gap-2 px-2", sidebarCollapsed && "justify-center")}>
        <Building2 className="size-7 shrink-0 text-[var(--brand-500)]" aria-hidden />
        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <VetanLogo />
            <p className="truncate text-xs text-muted-foreground">{user?.companyName ?? "Company"}</p>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-2",
          sidebarCollapsed && "flex-col"
        )}
      >
        <Avatar className="size-10 border border-border">
          <AvatarFallback className="bg-[color-mix(in_srgb,var(--brand-500)_20%,transparent)] text-xs font-semibold text-[var(--brand-200)]">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!sidebarCollapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user?.role.replace("_", " ")}
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavSection title="Main" items={main} collapsed={sidebarCollapsed} />
        <NavSection title="Finances" items={finances} collapsed={sidebarCollapsed} />
        <NavSection title="Settings" items={settings} collapsed={sidebarCollapsed} />
      </nav>

      <button
        type="button"
        onClick={() =>
          void (async () => {
            await logout();
            clearAuth();
            router.push("/login");
          })()
        }
        className={cn(
          "mb-2 flex w-full items-center gap-2 rounded-lg border border-border px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
          sidebarCollapsed && "justify-center px-0"
        )}
        aria-label="Log out"
      >
        <LogOut className="size-[18px] shrink-0" aria-hidden />
        {!sidebarCollapsed ? <span>Log out</span> : null}
      </button>

      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <>
            <PanelLeftClose className="size-4" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
