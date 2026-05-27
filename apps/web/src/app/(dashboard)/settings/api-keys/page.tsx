import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function ApiKeysPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">API keys</h1>
        <Button type="button" variant="secondary">
          Generate key
        </Button>
      </div>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Scoped keys with one-time reveal — Phase 14.</p>
      </GlassCard>
    </div>
  );
}
