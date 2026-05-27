"use client";

import { Search } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useCommandPaletteStore } from "@/lib/stores/command-palette-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

export function Header({ className }: { className?: string }) {
  const setPaletteOpen = useCommandPaletteStore((s) => s.setOpen);
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();

  return (
    <header
      className={cn(
        "glass-1 sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border px-4 backdrop-blur-xl md:px-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <span className="sr-only">Menu</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Button>
        <Breadcrumbs className="hidden min-w-0 sm:block" />
      </div>

      <div className="hidden max-w-md flex-1 md:block">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="glass-2 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--brand-500)_40%,transparent)] hover:text-foreground"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">Search…</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationMenu />
      </div>
    </header>
  );
}
