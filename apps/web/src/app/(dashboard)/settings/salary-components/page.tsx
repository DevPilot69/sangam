import { GlassCard } from "@/components/ui/glass-card";

export default function SalaryComponentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Salary components</h1>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">
          Basic, HRA, statutory rows (locked) and custom earnings — Phase 5 configuration surface.
        </p>
      </GlassCard>
    </div>
  );
}
