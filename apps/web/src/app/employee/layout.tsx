import { EmployeeAuthGuard } from "@/components/layout/employee-auth-guard";
import { EmployeeBottomNav } from "@/components/layout/employee-bottom-nav";
import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { EmployeeTopNav } from "@/components/layout/employee-top-nav";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmployeeAuthGuard>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <EmployeeSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <div className="md:hidden">
            <EmployeeTopNav />
          </div>
          <main className="flex-1 px-4 py-6 pb-28 md:px-8 md:pb-8">{children}</main>
          <EmployeeBottomNav />
        </div>
      </div>
    </EmployeeAuthGuard>
  );
}
