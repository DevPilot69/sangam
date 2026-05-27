"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchMeProfile } from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

type EmployeeOrgBrandProps = {
  className?: string;
  /** Compact: icon only on narrow headers */
  compact?: boolean;
};

/** Shows the employee's organization — not the Vetan SaaS product name. */
export function EmployeeOrgBrand({ className, compact }: EmployeeOrgBrandProps) {
  const token = useAuthStore((s) => s.token);

  const profileQuery = useQuery({
    queryKey: ["me", "profile", token],
    queryFn: () => fetchMeProfile(token!),
    enabled: !!token,
  });

  const companyName = profileQuery.data?.companyName?.trim() || "Your organization";
  const initials = initialsFromName(companyName);

  return (
    <Link
      href="/employee/dashboard"
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      title={companyName}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--brand-500)]/10 text-xs font-bold text-[var(--brand-500)]"
        aria-hidden
      >
        {initials}
      </span>
      {!compact ? (
        <span className="min-w-0 truncate font-[family-name:var(--font-display)] text-sm font-semibold leading-tight text-foreground">
          {companyName}
        </span>
      ) : null}
    </Link>
  );
}
