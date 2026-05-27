import { DashboardAuthGuard } from "@/components/layout/dashboard-auth-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGuard>
  );
}
