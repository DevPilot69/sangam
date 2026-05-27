import { GlassCard } from "@/components/ui/glass-card";

export default function LeaveTypesPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Leave types</h1>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Earned, sick, casual defaults with carry-forward rules.</p>
      </GlassCard>
    </div>
  );
}
