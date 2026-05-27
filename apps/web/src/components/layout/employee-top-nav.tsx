"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/auth/auth-store";
import { logout } from "@/lib/auth/auth-service";
import { EmployeeOrgBrand } from "@/components/employee/employee-org-brand";

export function EmployeeTopNav() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "E";

  return (
    <header className="glass-1 sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <EmployeeOrgBrand compact className="max-w-[10rem] sm:max-w-[14rem]" />
      <p className="hidden text-sm text-muted-foreground sm:block">
        {greet}, {user?.name?.split(" ")[0]} 👋
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "rounded-full border border-border",
            })}
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-3 border-border">
            <DropdownMenuItem onClick={() => router.push("/employee/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void (async () => {
                  await logout();
                  clearAuth();
                  router.push("/login");
                })();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
