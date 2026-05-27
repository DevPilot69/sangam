"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  "": "Home",
  dashboard: "Dashboard",
  employees: "Employees",
  organization: "Organization",
  "password-manager": "Password manager",
  new: "New",
  payroll: "Payroll",
  run: "Run",
  attendance: "Attendance",
  leave: "Leave",
  reports: "Reports",
  settings: "Settings",
  billing: "Billing",
  company: "Company",
  departments: "Departments",
  designations: "Designations",
  holidays: "Holidays",
  users: "Users & roles",
  "salary-components": "Salary components",
  "salary-structures": "Salary structures",
  "leave-types": "Leave types",
  "pay-groups": "Pay groups",
  notifications: "Notifications",
  webhooks: "Webhooks",
  "api-keys": "API keys",
  "audit-logs": "Audit logs",
  employee: "Employee",
  payslips: "Payslips",
  profile: "Profile",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labels[seg] ?? seg.replace(/-/g, " ");
    return { href, label, isLast: i === segments.length - 1 };
  });

  if (crumbs.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            <span className="px-0.5 text-muted-foreground" aria-hidden>
              ›
            </span>
            {c.isLast ? (
              <span className="font-medium text-foreground capitalize">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-foreground capitalize">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
