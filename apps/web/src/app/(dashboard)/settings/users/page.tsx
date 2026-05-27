import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Users & roles</h1>
        <Button type="button" className="shadow-[var(--shadow-brand)]">
          Invite user
        </Button>
      </div>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">RBAC matrix from master doc §3 — wired in Phase 9.</p>
      </GlassCard>
    </div>
  );
}
