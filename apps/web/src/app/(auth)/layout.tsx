import Link from "next/link";

import { VetanLogo } from "@/components/vetan-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/login" className="transition-opacity hover:opacity-90">
          <VetanLogo className="scale-110" />
        </Link>
        <p className="max-w-sm text-sm text-muted-foreground">
          Payroll-first operations for teams that need accuracy, compliance, and calm UX.
        </p>
      </div>
      {children}
    </div>
  );
}
