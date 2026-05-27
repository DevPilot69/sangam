"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  FileStack,
  Home,
  IndianRupee,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EmployeeOrgBrand } from "@/components/employee/employee-org-brand";
import { fetchMeProfile } from "@/lib/api/employee-portal";
import { logout } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

type NavGroup = {
  id: string;
  label: string;
  icon: typeof Home;
  items: { href: string; label: string }[];
};

const GROUPS: NavGroup[] = [
  {
    id: "leave",
    label: "Leave",
    icon: CalendarDays,
    items: [
      { href: "/employee/leave#apply", label: "Leave apply" },
      { href: "/employee/leave#balances", label: "Leave balances" },
      { href: "/employee/leave#holidays", label: "Holiday calendar" },
      { href: "/employee/leave#requests", label: "My requests" },
    ],
  },
  {
    id: "salary",
    label: "Salary",
    icon: IndianRupee,
    items: [{ href: "/employee/payslips", label: "Payslips" }],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: Clock,
    items: [{ href: "/employee/attendance", label: "Attendance info" }],
  },
];

function pathsForGroup(group: NavGroup): string[] {
  return group.items.map((i) => i.href.replace(/#.*$/, ""));
}

function routeMatchesGroup(pathname: string, group: NavGroup): boolean {
  return pathsForGroup(group).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function EmployeeSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  /** When true, user collapsed the group while on that route; when false, user forced open. */
  const [manualExpand, setManualExpand] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setManualExpand((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(prev)) {
        const g = GROUPS.find((x) => x.id === id);
        if (g && !routeMatchesGroup(pathname, g)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const profileQuery = useQuery({
    queryKey: ["me", "profile", token],
    queryFn: () => fetchMeProfile(token!),
    enabled: !!token,
  });

  const companyName = profileQuery.data?.companyName ?? "Your company";
  const firstName =
    profileQuery.data?.employee?.firstName ?? user?.name?.split(" ")?.[0] ?? "there";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "E";

  const homeActive = pathname === "/employee/dashboard" || pathname === "/employee";

  const documentsActive =
    pathname === "/employee/documents" || pathname.startsWith("/employee/documents/");

  function isExpanded(group: NavGroup): boolean {
    const hit = routeMatchesGroup(pathname, group);
    const m = manualExpand[group.id];
    if (m === false) return false;
    if (m === true) return true;
    return hit;
  }

  function toggleGroup(group: NavGroup) {
    const hit = routeMatchesGroup(pathname, group);
    const open = isExpanded(group);
    if (open) {
      setManualExpand((prev) => ({ ...prev, [group.id]: false }));
    } else {
      setManualExpand((prev) => ({ ...prev, [group.id]: true }));
      if (!hit) {
        const first = group.items[0];
        if (first) router.push(first.href);
      }
    }
  }

  function leafActive(href: string): boolean {
    const path = href.replace(/#.*$/, "");
    const wantHash = href.includes("#") ? `#${href.split("#")[1]}` : "";
    const onPath = pathname === path || pathname.startsWith(`${path}/`);
    if (!onPath) return false;
    if (!wantHash) return true;
    if (wantHash === "#apply") return hash === "#apply" || hash === "";
    return hash === wantHash;
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-screen w-[260px] shrink-0 flex-col border-r border-border bg-[var(--surface-sidebar)] md:flex",
        className
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-4">
        <EmployeeOrgBrand className="min-w-0 flex-1" />
      </div>

      <div className="border-b border-border px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {companyName}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <Avatar className="size-10 border border-border">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Hi {firstName}</p>
            <Link
              href="/employee/profile"
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-500)] hover:underline"
            >
              <UserRound className="size-3" />
              View my info
            </Link>
          </div>
          <Link
            href="/employee/profile"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-xs",
              className: "shrink-0 text-muted-foreground",
            })}
            aria-label="Profile settings"
          >
            <Settings className="size-4" />
          </Link>
        </div>
        {profileQuery.data?.employee ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {[profileQuery.data.employee.designation, profileQuery.data.employee.department]
              .filter(Boolean)
              .join(" · ") || "Employee self-service"}
          </p>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 text-sm" aria-label="Employee portal">
        <Link
          href="/employee/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
            homeActive
              ? "bg-[var(--brand-500)]/12 text-[var(--brand-500)]"
              : "text-foreground hover:bg-muted/60"
          )}
        >
          <Home className="size-4 shrink-0 opacity-80" />
          Home
        </Link>

        <Link
          href="/employee/documents"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
            documentsActive
              ? "bg-[var(--brand-500)]/12 text-[var(--brand-500)]"
              : "text-foreground hover:bg-muted/60"
          )}
        >
          <FileStack className="size-4 shrink-0 opacity-80" />
          Document center
        </Link>

        {GROUPS.map((group) => {
          const Icon = group.icon;
          const expanded = isExpanded(group);
          const childRoute = routeMatchesGroup(pathname, group);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium transition-colors hover:bg-muted/60",
                  childRoute ? "text-[var(--brand-500)]" : "text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                <span className="flex-1">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 opacity-60 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>
              {expanded ? (
                <ul className="relative ml-4 mt-0.5 space-y-0.5 border-l border-border py-1 pl-3">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                          leafActive(item.href)
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}

        <Link
          href="/employee/profile"
          className={cn(
            "mt-2 flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
            pathname === "/employee/profile"
              ? "bg-[var(--brand-500)]/12 text-[var(--brand-500)]"
              : "text-foreground hover:bg-muted/60"
          )}
        >
          <UserRound className="size-4 shrink-0 opacity-80" />
          My profile
        </Link>
      </nav>

      <div className="mt-auto space-y-2 border-t border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start gap-2 text-muted-foreground"
          )}
          onClick={() => {
            void (async () => {
              await logout();
              clearAuth();
              router.push("/login");
            })();
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
