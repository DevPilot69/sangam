import { PlatformAuthGuard } from "@/components/layout/platform-auth-guard";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";

export default function PlatformConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthGuard>
      <div className="flex min-h-screen">
        <PlatformSidebar />
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </PlatformAuthGuard>
  );
}
