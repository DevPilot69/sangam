import { GlassCard } from "@/components/ui/glass-card";

export default function WebhooksPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Webhooks</h1>
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Outbound events & delivery logs for integrations.</p>
      </GlassCard>
    </div>
  );
}
