"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { fetchNotifications, markNotificationRead } from "@/lib/api/notifications";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationCenterPanel() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", token],
    queryFn: () => fetchNotifications(token!, { limit: 50 }),
    enabled: !!token,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update"),
  });

  const items = query.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <GlassCard level={2} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Notification center</h2>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        <Bell className="size-5 text-[var(--brand-500)]" aria-hidden />
      </div>
      <div className="max-h-[min(28rem,60vh)] overflow-y-auto">
        {query.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                    !n.readAt && "bg-muted/20"
                  )}
                  onClick={() => {
                    if (!n.readAt) markRead.mutate(n.id);
                  }}
                >
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-[var(--accent-500)]"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.title}</span>
                    {n.body ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                    ) : null}
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {unread > 0 ? (
        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">Click a notification to mark it as read.</p>
        </div>
      ) : null}
    </GlassCard>
  );
}
