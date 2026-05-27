"use client";

import {
  Building2,
  CalendarDays,
  FileText,
  Landmark,
  Loader2,
  Rocket,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { ApiError } from "@/lib/api/client";
import {
  completeTenantOnboarding,
  createDepartment,
  createDesignation,
  fetchDepartments,
  fetchDesignations,
  patchTenant,
} from "@/lib/api/tenant";
import { fetchSessionUser } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vetan-onboarding";

const steps = ["Company", "Statutory", "Payroll", "Departments", "Review"];

const STEP_META = [
  {
    title: "Company profile",
    description: "How your organization appears on payslips, filings, and the admin console.",
    icon: Building2,
  },
  {
    title: "Statutory",
    description: "Company PAN unlocks statutory deductions and reporting when you connect payroll later.",
    icon: FileText,
  },
  {
    title: "Payroll cadence",
    description: "When salaries run each month. You can refine pay groups after launch.",
    icon: CalendarDays,
  },
  {
    title: "First department",
    description: "Creates your first org unit for employees and approvals.",
    icon: Users,
  },
  {
    title: "Review & launch",
    description: "Confirm details, then open your Vetan workspace.",
    icon: Rocket,
  },
] as const;

type Draft = {
  step: number;
  companyName: string;
  legalName: string;
  industry: string;
  pan: string;
  payDay: string;
  deptName: string;
};

const defaultDraft: Draft = {
  step: 0,
  companyName: "",
  legalName: "",
  industry: "Technology",
  pan: "",
  payDay: "28",
  deptName: "General",
};

function departmentCodeFromName(name: string): string {
  let c = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 24);
  if (!c) c = "MAIN";
  return c;
}

function StepCardHeader({ step }: { step: number }) {
  const meta = STEP_META[step];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] text-[var(--brand-300)] shadow-inner">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
          {meta.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);
  const [launching, setLaunching] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return defaultDraft;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultDraft, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return defaultDraft;
  });

  useEffect(() => {
    if (!user || !token) {
      router.replace("/login");
      return;
    }
    if (user.role === "employee") {
      router.replace("/employee/dashboard");
      return;
    }
    if (user.onboardingComplete) {
      router.replace("/");
    }
  }, [user, token, router]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  function canAdvanceFromCurrentStep(): boolean {
    if (draft.step === 0) return draft.companyName.trim().length > 0;
    return true;
  }

  function next() {
    if (!canAdvanceFromCurrentStep()) {
      toast.error("Enter your company name to continue.");
      return;
    }
    setDraft((d) => ({ ...d, step: Math.min(d.step + 1, steps.length - 1) }));
  }

  function back() {
    setDraft((d) => ({ ...d, step: Math.max(d.step - 1, 0) }));
  }

  async function launch() {
    if (!user || !token) return;
    const name = draft.companyName.trim();
    if (!name) {
      toast.error("Enter a company name on the first step.");
      return;
    }
    const legal = draft.legalName.trim() || name;
    const industry = draft.industry.trim() || "General";
    const deptName = draft.deptName.trim() || "General";

    setLaunching(true);
    try {
      await patchTenant(token, {
        name,
        legalName: legal,
        industry,
      });

      let departmentId: string | undefined;
      const existingDepts = await fetchDepartments(token);
      if (existingDepts.length === 0) {
        const code = departmentCodeFromName(deptName);
        let created = false;
        for (let attempt = 0; attempt < 6 && !created; attempt++) {
          const tryCode = attempt === 0 ? code : `${code.slice(0, 20)}${attempt}`;
          try {
            const d = await createDepartment(token, { name: deptName, code: tryCode });
            departmentId = d.id;
            created = true;
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) continue;
            throw e;
          }
        }
        if (!created) {
          throw new ApiError("Could not create a department (code conflict).", 400, null);
        }
      } else {
        departmentId = existingDepts[0]?.id;
      }

      const existingDes = await fetchDesignations(token);
      if (existingDes.length === 0) {
        await createDesignation(token, {
          title: "Primary",
          departmentId,
        });
      }

      await completeTenantOnboarding(token);

      const refreshed = await fetchSessionUser(token);
      setUser(refreshed);
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("Welcome to Vetan");
      router.push("/");
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Could not finish onboarding. Try again or check the API logs.");
      }
    } finally {
      setLaunching(false);
    }
  }

  if (!user || !token) return null;

  const stepIndex = draft.step;
  const meta = STEP_META[stepIndex];

  return (
    <div className="relative w-full max-w-3xl pb-28 md:pb-10">
      <header className="mb-8 space-y-3 text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-300)]">
          Workspace setup
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Set up your company
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:mx-0">
          A few quick steps—we&apos;ll save your progress if you refresh. You can refine statutory and payroll details
          later in Settings.
        </p>
      </header>

      <GlassCard level={3} className="mb-6 rounded-2xl border border-border-subtle p-4 shadow-[var(--shadow-md)] md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-xs font-medium tabular-nums text-muted-foreground">
              Step <span className="text-foreground">{stepIndex + 1}</span> of {steps.length}
            </p>
            <p className="text-sm font-medium text-foreground sm:text-right">{meta.title}</p>
          </div>
          <Stepper steps={steps} current={draft.step} className="pt-1" />
        </div>
      </GlassCard>

      <GlassCard
        level={4}
        className="rounded-2xl border border-border shadow-[var(--shadow-lg)]"
        header={<StepCardHeader step={stepIndex} />}
      >
        {draft.step === 0 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cn">
                Company name <span className="text-[var(--danger-text)]">*</span>
              </Label>
              <Input
                id="cn"
                className="h-11 text-base"
                placeholder="e.g. Acme India Pvt Ltd"
                value={draft.companyName}
                onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ind">Industry</Label>
                <Input
                  id="ind"
                  className="h-11"
                  placeholder="Technology, Manufacturing…"
                  value={draft.industry}
                  onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal">Legal entity name</Label>
                <Input
                  id="legal"
                  className="h-11"
                  placeholder="As on tax records"
                  value={draft.legalName}
                  onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Defaults to company name if left blank.</p>
              </div>
            </div>
          </div>
        ) : null}

        {draft.step === 1 ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
              Optional for now—payroll deductions stay disabled until PAN and statutory rules are complete in
              Settings.
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan">Company PAN</Label>
              <Input
                id="pan"
                className="h-11 max-w-xs font-mono uppercase tracking-wider"
                placeholder="ABCDE1234F"
                value={draft.pan}
                onChange={(e) => setDraft((d) => ({ ...d, pan: e.target.value.toUpperCase() }))}
                maxLength={10}
              />
            </div>
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={next}>
              Skip for now →
            </Button>
          </div>
        ) : null}

        {draft.step === 2 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Pay cycle</Label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-border bg-[color-mix(in_srgb,var(--brand-500)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--brand-200)]">
                  Monthly
                </span>
                <span className="text-sm text-muted-foreground">MVP default — more cycles later.</span>
              </div>
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="pd">Pay date</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pd"
                  type="number"
                  className="h-11 font-mono tabular-nums"
                  min={1}
                  max={31}
                  value={draft.payDay}
                  onChange={(e) => setDraft((d) => ({ ...d, payDay: e.target.value }))}
                />
                <span className="shrink-0 text-sm text-muted-foreground">day of month</span>
              </div>
            </div>
          </div>
        ) : null}

        {draft.step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This becomes your first department in the directory. You can add more anytime.
            </p>
            <div className="max-w-md space-y-2">
              <Label htmlFor="dep">Department name</Label>
              <Input
                id="dep"
                className="h-11"
                placeholder="e.g. Engineering, HQ, Operations"
                value={draft.deptName}
                onChange={(e) => setDraft((d) => ({ ...d, deptName: e.target.value }))}
              />
            </div>
          </div>
        ) : null}

        {draft.step === 4 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-muted/15 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Building2 className="size-3.5" aria-hidden />
                  Company
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-right font-medium">{draft.companyName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Legal</dt>
                    <dd className="text-right font-medium">{draft.legalName.trim() || draft.companyName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Industry</dt>
                    <dd className="text-right">{draft.industry || "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-border-subtle bg-muted/15 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Landmark className="size-3.5" aria-hidden />
                  Payroll
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Cycle</dt>
                    <dd className="text-right font-medium">Monthly</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Pay date</dt>
                    <dd className="text-right font-mono tabular-nums">{draft.payDay}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-muted/15 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                Organization
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">PAN</dt>
                  <dd className="text-right font-mono">{draft.pan || "Skipped"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="text-right font-medium">{draft.deptName}</dd>
                </div>
              </dl>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full shadow-[var(--shadow-brand)]"
              disabled={launching || !draft.companyName.trim()}
              onClick={() => void launch()}
            >
              {launching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Rocket className="mr-2 size-4" aria-hidden />
                  Launch Vetan
                </>
              )}
            </Button>
          </div>
        ) : null}
      </GlassCard>

      {draft.step < 4 ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[color-mix(in_srgb,var(--bg-base)_92%,transparent)] px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--bg-base)_85%,transparent)]",
            "md:static md:z-0 md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
          )}
        >
          <div className="mx-auto flex max-w-3xl justify-between gap-3">
            <Button type="button" variant="secondary" className="min-w-[100px]" disabled={draft.step === 0} onClick={back}>
              Back
            </Button>
            <Button
              type="button"
              className="min-w-[120px] shadow-[var(--shadow-brand)]"
              disabled={!canAdvanceFromCurrentStep()}
              onClick={next}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
