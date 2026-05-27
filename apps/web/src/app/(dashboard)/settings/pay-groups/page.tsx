import { GlassCard } from "@/components/ui/glass-card";

export default function PayGroupsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Pay groups</h1>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Group employees by pay policy for phased payroll runs.</p>
      </GlassCard>
    </div>
  );
}
