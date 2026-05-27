import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";

export default function SalaryStructuresPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Salary structures</h1>
        <Link href="/settings/salary-structures/new" className={buttonVariants()}>
          Create structure
        </Link>
      </div>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Drag-reorder builder with live ₹50k preview — scaffolded.</p>
      </GlassCard>
    </div>
  );
}
