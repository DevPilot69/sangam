"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchNotifications } from "@/lib/api/notifications";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationMenu() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: ["notifications", token],
    queryFn: () => fetchNotifications(token!, { limit: 20 }),
    enabled: !!token,
  });

  const items = query.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative shrink-0 overflow-visible border border-border"
        )}
      >
        <Bell className="size-4" aria-hidden />
        <span className="sr-only">Notifications</span>
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--accent-500)] px-1 text-[10px] font-semibold leading-none text-background ring-2 ring-background"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="glass-3 w-80 max-w-[calc(100vw-2rem)] border-border p-0"
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="max-h-[min(22rem,65vh)] overflow-y-auto overscroll-contain py-1">
          {query.isLoading ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No notifications.</p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                closeOnClick={false}
                className={cn(
                  "mx-1 flex cursor-default flex-col items-start gap-1 rounded-md px-2 py-2.5 whitespace-normal",
                  !n.readAt && "bg-muted/40"
                )}
              >
                <div className="flex w-full gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background",
                      !n.readAt && "border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)]"
                    )}
                  >
                    <Bell className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{n.title}</span>
                      {!n.readAt ? (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--accent-500)]" />
                      ) : null}
                    </div>
                    {n.body ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="mx-1 mb-1 cursor-pointer justify-center rounded-md py-2 text-sm font-medium text-primary"
          onClick={() => router.push("/settings/notifications")}
        >
          Open notification center
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
