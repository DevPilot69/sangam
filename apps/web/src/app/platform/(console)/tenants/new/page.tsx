"use client";

import {
  Building2,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Landmark,
  Loader2,
  Rocket,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LiveStatusBadge } from "@/components/platform/live-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { ApiError } from "@/lib/api/client";
import {
  checkPlatformTenantSlug,
  provisionPlatformTenant,
  type ProvisionTenantPayload,
  type TenantPaymentStatus,
} from "@/lib/api/platform";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { suggestCompanyCodeFromName } from "@/lib/org/default-credentials";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

const STORAGE_KEY = "vetan-platform-tenant-onboarding";

const STEPS = ["Organization", "Statutory", "Billing", "Administrator", "Structure", "Review"];

const STEP_META = [
  {
    title: "Organization identity",
    description: "Legal entity and workspace slug used for login URLs.",
    icon: Building2,
  },
  {
    title: "Statutory & payroll cadence",
    description: "Stored in tenant settings for payslips and compliance later.",
    icon: Landmark,
  },
  {
    title: "Vetan billing",
    description: "Subscription status, fees, and payment tracking for this customer.",
    icon: IndianRupee,
  },
  {
    title: "Tenant administrator",
    description: "First ADMIN user who can sign in to the customer workspace.",
    icon: UserCog,
  },
  {
    title: "Initial org structure",
    description: "Minimum department and designation required to mark workspace ready.",
    icon: Users,
  },
  {
    title: "Review & provision",
    description: "Creates tenant, subscription, billing ops, admin, and org records in one step.",
    icon: Rocket,
  },
] as const;

const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Finance",
  "Professional Services",
  "Other",
];

type Draft = {
  step: number;
  name: string;
  legalName: string;
  companyCode: string;
  companyCodeTouched: boolean;
  slug: string;
  industry: string;
  country: string;
  pan: string;
  payDay: string;
  planCode: string;
  subscriptionStatus: "TRIALING" | "ACTIVE";
  trialDays: string;
  monthlyFeeInr: string;
  monthlyServerCostInr: string;
  paymentStatus: TenantPaymentStatus;
  billingNotes: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  verifyAdminEmail: boolean;
  departmentName: string;
  departmentCode: string;
  designationTitle: string;
  markOnboardingComplete: boolean;
  /** When true, slug is not auto-filled from company name */
  slugTouched: boolean;
};

const defaultDraft: Draft = {
  step: 0,
  name: "",
  legalName: "",
  companyCode: "",
  companyCodeTouched: false,
  slug: "",
  industry: "Technology",
  country: "IN",
  pan: "",
  payDay: "28",
  planCode: "GROWTH",
  subscriptionStatus: "TRIALING",
  trialDays: "14",
  monthlyFeeInr: "4999",
  monthlyServerCostInr: "800",
  paymentStatus: "UNPAID",
  billingNotes: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  verifyAdminEmail: false,
  departmentName: "General",
  departmentCode: "",
  designationTitle: "Primary",
  markOnboardingComplete: true,
  slugTouched: false,
};

/** Slug from company name (fallback when slug field is empty). */
function slugifyFromName(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s.length > 0 ? s : "workspace";
}

/** Normalize slug input; allows empty so the field can be cleared and retyped. */
function normalizeSlugInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

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
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] text-[var(--brand-300)]">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          {meta.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
      </div>
    </div>
  );
}

export default function PlatformTenantOnboardingPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const [submitting, setSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [provisioned, setProvisioned] = useState<{
    id: string;
    slug: string;
    name: string;
    loginUrl: string;
    liveStatus: string;
    adminEmail: string;
  } | null>(null);

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
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const effectiveSlug = draft.slug.trim() || slugifyFromName(draft.name);
  const effectiveCompanyCode =
    draft.companyCode.trim().toUpperCase() || suggestCompanyCodeFromName(draft.name);

  const checkSlug = useCallback(
    async (slug: string) => {
      if (!token || slug.length < 2) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      try {
        const res = await checkPlatformTenantSlug(token, slug);
        setSlugStatus(res.available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    },
    [token]
  );

  useEffect(() => {
    if (draft.step !== 0 || !effectiveSlug) return;
    const t = setTimeout(() => void checkSlug(effectiveSlug), 400);
    return () => clearTimeout(t);
  }, [draft.step, effectiveSlug, checkSlug]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function suggestSlugFromName() {
    setDraft((d) => ({
      ...d,
      slug: slugifyFromName(d.name),
      slugTouched: false,
    }));
  }

  function canAdvance(): boolean {
    switch (draft.step) {
      case 0:
        return draft.name.trim().length >= 2 && slugStatus !== "taken";
      case 3:
        return (
          draft.adminName.trim().length >= 2 &&
          draft.adminEmail.includes("@") &&
          draft.adminPassword.length >= 8
        );
      default:
        return true;
    }
  }

  function next() {
    if (!canAdvance()) {
      if (draft.step === 0) {
        toast.error("Enter a company name and fix the workspace slug.");
      } else if (draft.step === 3) {
        toast.error("Complete administrator name, email, and password.");
      }
      return;
    }
    setDraft((d) => ({ ...d, step: Math.min(d.step + 1, STEPS.length - 1) }));
  }

  function back() {
    setDraft((d) => ({ ...d, step: Math.max(d.step - 1, 0) }));
  }

  const reviewPayload = useMemo((): ProvisionTenantPayload => {
    const settings: Record<string, unknown> = {};
    if (draft.pan.trim()) {
      settings.company = { pan: draft.pan.trim().toUpperCase() };
    }
    if (draft.payDay.trim()) {
      settings.payroll = { payDay: Number(draft.payDay) };
    }
    return {
      name: draft.name.trim(),
      legalName: draft.legalName.trim() || undefined,
      companyCode: effectiveCompanyCode,
      slug: effectiveSlug,
      industry: draft.industry,
      country: draft.country,
      settings: Object.keys(settings).length ? settings : undefined,
      planCode: draft.planCode,
      subscriptionStatus: draft.subscriptionStatus,
      trialDays: Number(draft.trialDays) || 14,
      monthlyFeeInr: Number(draft.monthlyFeeInr) || 0,
      monthlyServerCostInr: Number(draft.monthlyServerCostInr) || 800,
      paymentStatus: draft.paymentStatus,
      billingNotes: draft.billingNotes.trim() || undefined,
      adminName: draft.adminName.trim(),
      adminEmail: draft.adminEmail.trim(),
      adminPassword: draft.adminPassword,
      verifyAdminEmail: draft.verifyAdminEmail,
      departmentName: draft.departmentName.trim() || "General",
      departmentCode: draft.departmentCode.trim() || undefined,
      designationTitle: draft.designationTitle.trim() || "Primary",
      markOnboardingComplete: draft.markOnboardingComplete,
    };
  }, [draft, effectiveSlug]);

  async function provision() {
    if (!token) return;
    setSubmitting(true);
    try {
      const result = await provisionPlatformTenant(token, reviewPayload);
      sessionStorage.removeItem(STORAGE_KEY);
      setProvisioned({
        id: result.id,
        slug: result.slug,
        name: result.name,
        loginUrl: result.loginUrl,
        liveStatus: result.liveStatus,
        adminEmail: result.admin.email,
      });
      toast.success("Tenant provisioned");
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Provisioning failed. Check API logs.");
    } finally {
      setSubmitting(false);
    }
  }

  if (provisioned) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <GlassCard level={3} className="text-center">
          <CheckCircle2 className="mx-auto size-12 text-[var(--success-text)]" />
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold">
            {provisioned.name} is ready
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workspace <span className="font-mono">{provisioned.slug}</span> · Admin{" "}
            {provisioned.adminEmail}
          </p>
          <div className="mt-4 flex justify-center">
            <LiveStatusBadge status={provisioned.liveStatus} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/platform/tenants/${provisioned.id}`}>
              <Button>View tenant profile</Button>
            </Link>
            <Link href="/platform/tenants">
              <Button variant="outline">Back to list</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Customer login: {provisioned.loginUrl}
          </p>
        </GlassCard>
      </div>
    );
  }

  const stepIndex = draft.step;
  const selectClass =
    "flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <Link href="/platform/tenants" className="text-sm text-muted-foreground hover:underline">
          ← All tenants
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
          Onboard tenant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sequential setup for organizations you provision manually from the platform console.
        </p>
      </div>

      <GlassCard level={2} className="p-4 md:p-5">
        <p className="mb-3 text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <Stepper steps={STEPS} current={stepIndex} />
      </GlassCard>

      <GlassCard level={3} header={<StepCardHeader step={stepIndex} />}>
        {stepIndex === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company / workspace name *</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    name,
                    ...(!d.slugTouched ? { slug: slugifyFromName(name) } : {}),
                    ...(!d.companyCodeTouched
                      ? { companyCode: suggestCompanyCodeFromName(name) }
                      : {}),
                  }));
                }}
                placeholder="Acme Payroll Pvt Ltd"
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="companyCode">Company code *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-7 text-xs"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      companyCode: suggestCompanyCodeFromName(d.name),
                      companyCodeTouched: false,
                    }))
                  }
                  disabled={!draft.name.trim()}
                >
                  Suggest from name
                </Button>
              </div>
              <Input
                id="companyCode"
                value={draft.companyCode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    companyCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
                    companyCodeTouched: true,
                  }))
                }
                placeholder={suggestCompanyCodeFromName(draft.name) || "AC"}
                className="font-mono uppercase"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Unique 2–8 letters/numbers. Employee logins use this + employee ID (e.g.{" "}
                {effectiveCompanyCode || "BR"}EMP-0001).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal">Legal name</Label>
              <Input
                id="legal"
                value={draft.legalName}
                onChange={(e) => update("legalName", e.target.value)}
                placeholder="Same as company name if blank"
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="slug">Workspace slug *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-7 text-xs"
                  onClick={suggestSlugFromName}
                  disabled={!draft.name.trim()}
                >
                  Suggest from company name
                </Button>
              </div>
              <Input
                id="slug"
                value={draft.slug}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    slug: normalizeSlugInput(e.target.value),
                    slugTouched: true,
                  }))
                }
                placeholder={slugifyFromName(draft.name) || "workspace"}
                className="font-mono"
              />
              <p
                className={cn(
                  "text-xs",
                  slugStatus === "taken" && "text-[var(--danger-text)]",
                  slugStatus === "ok" && "text-[var(--success-text)]",
                  slugStatus === "checking" && "text-muted-foreground"
                )}
              >
                {slugStatus === "checking" && "Checking availability…"}
                {slugStatus === "ok" && `Slug "${effectiveSlug}" is available`}
                {slugStatus === "taken" && `Slug "${effectiveSlug}" is already taken`}
                {slugStatus === "idle" && `Login URL segment: ${effectiveSlug}`}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  className={selectClass}
                  value={draft.industry}
                  onChange={(e) => update("industry", e.target.value)}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={draft.country}
                  onChange={(e) => update("country", e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pan">Company PAN</Label>
              <Input
                id="pan"
                value={draft.pan}
                onChange={(e) => update("pan", e.target.value.toUpperCase())}
                placeholder="AAAAA9999A"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payDay">Monthly pay day (1–31)</Label>
              <Input
                id="payDay"
                type="number"
                min={1}
                max={31}
                value={draft.payDay}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === "" || (n >= 1 && n <= 31)) {
                    update("payDay", e.target.value);
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription status</Label>
              <select
                className={selectClass}
                value={draft.subscriptionStatus}
                onChange={(e) =>
                  update("subscriptionStatus", e.target.value as "TRIALING" | "ACTIVE")
                }
              >
                <option value="TRIALING">Trialing</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            {draft.subscriptionStatus === "TRIALING" ? (
              <div className="space-y-2">
                <Label>Trial days</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={draft.trialDays}
                  onChange={(e) => update("trialDays", e.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Monthly fee (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.monthlyFeeInr}
                  onChange={(e) => update("monthlyFeeInr", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Est. server cost (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.monthlyServerCostInr}
                  onChange={(e) => update("monthlyServerCostInr", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment status (your books)</Label>
              <select
                className={selectClass}
                value={draft.paymentStatus}
                onChange={(e) => update("paymentStatus", e.target.value as TenantPaymentStatus)}
              >
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="WAIVED">Waived</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Billing notes</Label>
              <Input
                value={draft.billingNotes}
                onChange={(e) => update("billingNotes", e.target.value)}
                placeholder="PO number, special terms…"
              />
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin full name *</Label>
              <Input
                value={draft.adminName}
                onChange={(e) => update("adminName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Admin email *</Label>
              <Input
                type="email"
                value={draft.adminEmail}
                onChange={(e) => update("adminEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Initial password *</Label>
              <Input
                type="password"
                value={draft.adminPassword}
                onChange={(e) => update("adminPassword", e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Min 8 chars, uppercase, number, and special character.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.verifyAdminEmail}
                onCheckedChange={(v) => update("verifyAdminEmail", v === true)}
              />
              Require email verification before first login
            </label>
          </div>
        ) : null}

        {stepIndex === 4 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>First department</Label>
              <Input
                value={draft.departmentName}
                onChange={(e) => update("departmentName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department code</Label>
              <Input
                value={draft.departmentCode}
                onChange={(e) => update("departmentCode", e.target.value.toUpperCase())}
                placeholder={departmentCodeFromName(draft.departmentName)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>First designation</Label>
              <Input
                value={draft.designationTitle}
                onChange={(e) => update("designationTitle", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.markOnboardingComplete}
                onCheckedChange={(v) => update("markOnboardingComplete", v === true)}
              />
              Mark workspace onboarding complete (customer skips setup wizard)
            </label>
          </div>
        ) : null}

        {stepIndex === 5 ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="size-4" />
              Confirm before provisioning
            </div>
            <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
              {[
                ["Workspace", draft.name],
                ["Company code", effectiveCompanyCode],
                ["Slug", effectiveSlug],
                [
                  "Subscription",
                  draft.subscriptionStatus,
                ],
                [
                  "Billing",
                  `${formatCurrency(Number(draft.monthlyFeeInr))} fee · ${draft.paymentStatus}`,
                ],
                ["Admin", `${draft.adminName} · ${draft.adminEmail}`],
                [
                  "Structure",
                  `${draft.departmentName} / ${draft.designationTitle}`,
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </GlassCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={back} disabled={stepIndex === 0 || submitting}>
          Back
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={() => void provision()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Provisioning…
              </>
            ) : (
              "Provision tenant"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

