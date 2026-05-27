"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Clock, FileStack, Home, User } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/employee/dashboard", label: "Home", icon: Home },
  { href: "/employee/documents", label: "Docs", icon: FileStack },
  { href: "/employee/payslips", label: "Payslips", icon: ClipboardList },
  { href: "/employee/leave", label: "Leave", icon: CalendarDays },
  { href: "/employee/attendance", label: "Attendance", icon: Clock },
  { href: "/employee/profile", label: "Profile", icon: User },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-2 fixed bottom-0 left-0 right-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] sm:text-[10px]",
              active ? "text-[var(--brand-500)]" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
