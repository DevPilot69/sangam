"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BankSalaryFields } from "@/components/employees/bank-salary-fields";
import { NotificationSettingsPanel } from "@/components/settings/notification-settings-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/client";
import {
  fetchTenant,
  patchTenant,
  patchTenantSettings,
  type ApiTenant,
} from "@/lib/api/tenant";
import { Permission } from "@/lib/auth/permissions";
import { changeAuthPassword, fetchSessionUser, patchAuthProfile } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { type SalaryPaymentMethod } from "@/lib/banking/payment-methods";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cn } from "@/lib/utils";

const TAB_KEYS = [
  "personal",
  "company",
  "statutory",
  "payroll",
  "documents",
  "saas",
  "organization",
  "banking",
  "notifications",
] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(v: string | null): v is TabKey {
  return !!v && (TAB_KEYS as readonly string[]).includes(v);
}

function readObj(root: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
  const v = root?.[key];
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

const textareaClass = cn(
  "min-h-[88px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function WorkspaceSettingsClient() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(Permission["settings:write"]);
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();

  const rawTab = sp.get("tab");
  const tab: TabKey = isTabKey(rawTab) ? (rawTab as TabKey) : "personal";
  const setTab = useCallback(
    (v: string) => {
      const u = new URLSearchParams(sp.toString());
      u.set("tab", v);
      router.replace(`/settings/workspace?${u.toString()}`, { scroll: false });
    },
    [router, sp]
  );

  const tenantQuery = useQuery({
    queryKey: ["tenant", "workspace"],
    queryFn: () => fetchTenant(token!),
    enabled: !!token,
  });

  const settings = tenantQuery.data?.settings ?? {};

  const [coreName, setCoreName] = useState("");
  const [coreLegal, setCoreLegal] = useState("");
  const [coreIndustry, setCoreIndustry] = useState("");
  const [coreCountry, setCoreCountry] = useState("IN");

  const [cp, setCp] = useState<Record<string, string>>({});
  const [st, setSt] = useState<Record<string, string>>({});
  const [py, setPy] = useState<Record<string, string>>({});
  const [pyBool, setPyBool] = useState({
    variablePayEnabled: false,
    overtimeEnabled: false,
    reimbursementEnabled: false,
  });
  const [doc, setDoc] = useState<Record<string, string>>({});
  const [saas, setSaas] = useState<Record<string, string>>({});
  const [saasBool, setSaasBool] = useState({ apiAccess: false, auditLogsEnabled: false });
  const [featureFlagsJson, setFeatureFlagsJson] = useState("{}");
  const [bank, setBank] = useState({
    bankName: "",
    bankAccount: "",
    ifsc: "",
    salaryPaymentMethod: "NEFT" as SalaryPaymentMethod,
  });
  const [notif, setNotif] = useState({
    emailNotifications: true,
    payslipEmails: true,
    leaveNotifications: false,
  });

  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPhoneAlt, setPPhoneAlt] = useState("");
  const [pAadhar, setPAadhar] = useState("");
  const [pPan, setPPan] = useState("");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  const syncFromTenant = useCallback((t: ApiTenant) => {
    setCoreName(t.name ?? "");
    setCoreLegal(t.legalName ?? "");
    setCoreIndustry(t.industry ?? "");
    setCoreCountry(t.country ?? "IN");

    const c = readObj(t.settings, "companyProfile");
    setCp({
      officialEmail: str(c.officialEmail),
      companyType: str(c.companyType),
      industryType: str(c.industryType),
      registrationNumber: str(c.registrationNumber),
      incorporationDate: str(c.incorporationDate),
      companyPan: str(c.companyPan),
      tan: str(c.tan),
      gst: str(c.gst),
      cin: str(c.cin),
      companyAddress: str(c.companyAddress),
      websiteUrl: str(c.websiteUrl),
    });

    const s = readObj(t.settings, "statutoryCompliance");
    setSt({
      pfRegistrationNumber: str(s.pfRegistrationNumber),
      esicNumber: str(s.esicNumber),
      professionalTaxNumber: str(s.professionalTaxNumber),
      labourWelfareFundDetails: str(s.labourWelfareFundDetails),
      tdsCircleWard: str(s.tdsCircleWard),
      shopEstablishmentLicense: str(s.shopEstablishmentLicense),
      msmeNumber: str(s.msmeNumber),
      startupIndiaRegistration: str(s.startupIndiaRegistration),
    });

    const p = readObj(t.settings, "payrollConfiguration");
    setPy({
      salaryCycle: str(p.salaryCycle),
      payDate: str(p.payDate),
      currency: str(p.currency) || "INR",
      payrollFrequency: str(p.payrollFrequency),
      payrollStartMonth: str(p.payrollStartMonth),
      salaryComponents: str(p.salaryComponents),
    });
    setPyBool({
      variablePayEnabled: bool(p.variablePayEnabled) ?? false,
      overtimeEnabled: bool(p.overtimeEnabled) ?? false,
      reimbursementEnabled: bool(p.reimbursementEnabled) ?? false,
    });

    const d = readObj(t.settings, "documentTemplates");
    setDoc({
      payslipTemplate: str(d.payslipTemplate),
      offerLetterTemplate: str(d.offerLetterTemplate),
      appointmentLetterTemplate: str(d.appointmentLetterTemplate),
      salaryRevisionLetterTemplate: str(d.salaryRevisionLetterTemplate),
      experienceLetterTemplate: str(d.experienceLetterTemplate),
      form16Template: str(d.form16Template),
    });

    const z = readObj(t.settings, "saasTenant");
    setSaas({
      billingCycle: str(z.billingCycle),
      activeUsersLimit: str(z.activeUsersLimit),
      storageLimit: str(z.storageLimit),
      customBranding: str(z.customBranding),
      customDomain: str(z.customDomain),
    });
    setSaasBool({
      apiAccess: bool(z.apiAccess) ?? false,
      auditLogsEnabled: bool(z.auditLogsEnabled) ?? false,
    });
    try {
      setFeatureFlagsJson(JSON.stringify(z.featureFlags && typeof z.featureFlags === "object" ? z.featureFlags : {}, null, 2));
    } catch {
      setFeatureFlagsJson("{}");
    }

    const b = readObj(t.settings, "bankingDisbursement");
    const method = str(b.salaryPaymentMethod).toUpperCase();
    setBank({
      bankName: str(b.bankName),
      bankAccount: str(b.companyBankAccount),
      ifsc: str(b.ifsc),
      salaryPaymentMethod:
        method === "RTGS" ||
        method === "IMPS" ||
        method === "CHEQUE" ||
        method === "CASH"
          ? (method as SalaryPaymentMethod)
          : "NEFT",
    });

    const n = readObj(t.settings, "notifications");
    setNotif({
      emailNotifications: bool(n.emailNotifications) ?? true,
      payslipEmails: bool(n.payslipEmails) ?? true,
      leaveNotifications: bool(n.leaveNotifications) ?? false,
    });
  }, []);

  useEffect(() => {
    if (tenantQuery.data) syncFromTenant(tenantQuery.data);
  }, [tenantQuery.data, syncFromTenant]);

  useEffect(() => {
    if (!user) return;
    setPName(user.name ?? "");
    setPEmail(user.email ?? "");
    setPPhone(user.phone ?? "");
    setPPhoneAlt(user.phoneAlt ?? "");
    setPAadhar(user.aadhar ?? "");
    setPPan(user.pan ?? "");
  }, [user]);

  const invalidateTenant = () => qc.invalidateQueries({ queryKey: ["tenant", "workspace"] });

  const saveCore = useMutation({
    mutationFn: async () => {
      await patchTenant(token!, {
        name: coreName.trim(),
        legalName: coreLegal.trim() || undefined,
        industry: coreIndustry.trim() || undefined,
        country: coreCountry.trim() || "IN",
      });
    },
    onSuccess: () => {
      toast.success("Workspace identity saved.");
      invalidateTenant();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const saveSection = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await patchTenantSettings(token!, body);
    },
    onSuccess: () => {
      toast.success("Settings saved.");
      invalidateTenant();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const u = await patchAuthProfile(token!, {
        name: pName.trim(),
        email: pEmail.trim(),
        phone: pPhone.trim() || undefined,
        phoneAlt: pPhoneAlt.trim() || undefined,
        aadhar: pAadhar.trim() || undefined,
        pan: pPan.trim() || undefined,
      });
      setUser(u);
    },
    onSuccess: () => toast.success("Profile updated."),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (newPwd !== newPwd2) throw new Error("New passwords do not match.");
      if (newPwd.length < 8) throw new Error("New password must be at least 8 characters.");
      await changeAuthPassword(token!, curPwd, newPwd);
    },
    onSuccess: async () => {
      toast.success("Password changed. Sign in again on other devices.");
      setCurPwd("");
      setNewPwd("");
      setNewPwd2("");
      try {
        const fresh = await fetchSessionUser(token!);
        setUser(fresh);
      } catch {
        /* ignore */
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not change password"),
  });

  const subscription = tenantQuery.data?.subscription;
  const tenantId = tenantQuery.data?.id;

  const parseFlags = (): Record<string, unknown> => {
    const raw = featureFlagsJson.trim() || "{}";
    return JSON.parse(raw) as Record<string, unknown>;
  };

  const saveSaas = () => {
    let flags: Record<string, unknown>;
    try {
      flags = parseFlags();
    } catch {
      toast.error("Feature flags must be valid JSON.");
      return;
    }
    saveSection.mutate({
      saasTenant: {
        ...saas,
        ...saasBool,
        featureFlags: flags,
      },
    });
  };

  const orgLinks = useMemo(
    () => [
      { href: "/organization?tab=departments", label: "Departments", required: true },
      { href: "/organization?tab=designations", label: "Designations", required: true },
      { href: "/employees", label: "Reporting managers", note: "Set per employee in the directory" },
      { href: "/employees", label: "Employee types", note: "Classify in employee profiles (HR)" },
    ],
    []
  );

  if (!token) {
    return <p className="text-sm text-muted-foreground">Sign in to manage workspace settings.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Workspace settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Tenant profile, payroll preferences, statutory identifiers, and SaaS controls. Changes to JSON-backed sections merge with existing data.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-2 flex h-auto min-h-10 w-full flex-wrap justify-start gap-0.5 border border-border p-1">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="statutory">Statutory</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="saas">SaaS</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4 space-y-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Personal (tenant admin)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your sign-in identity and KYC-style fields stored on your user record.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" value={pName} onChange={(e) => setPName(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Phone</Label>
                <Input id="p-phone" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone-alt">Alternate phone</Label>
                <Input id="p-phone-alt" value={pPhoneAlt} onChange={(e) => setPPhoneAlt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-aadhar">Aadhaar number</Label>
                <Input id="p-aadhar" value={pAadhar} onChange={(e) => setPAadhar(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pan">PAN</Label>
                <Input id="p-pan" value={pPan} onChange={(e) => setPPan(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 shadow-[var(--shadow-brand)]"
              disabled={saveProfile.isPending}
              onClick={() => saveProfile.mutate()}
            >
              Save personal info
            </Button>
          </GlassCard>

          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Change password</h2>
            <div className="mt-4 grid max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="pwd-cur">Current password</Label>
                <Input id="pwd-cur" type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-new">New password</Label>
                <Input id="pwd-new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-new2">Confirm new password</Label>
                <Input id="pwd-new2" type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={savePassword.isPending}
              onClick={() => savePassword.mutate()}
            >
              Update password
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="company" className="mt-4 space-y-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Workspace identity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Core tenant record (name, legal name, industry).</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-name">Company / workspace name</Label>
                <Input id="c-name" value={coreName} onChange={(e) => setCoreName(e.target.value)} disabled={!canWrite} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-legal">Legal name</Label>
                <Input id="c-legal" value={coreLegal} onChange={(e) => setCoreLegal(e.target.value)} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-ind">Industry</Label>
                <Input id="c-ind" value={coreIndustry} onChange={(e) => setCoreIndustry(e.target.value)} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-country">Country (ISO-2)</Label>
                <Input id="c-country" value={coreCountry} onChange={(e) => setCoreCountry(e.target.value)} disabled={!canWrite} />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveCore.isPending}
              onClick={() => saveCore.mutate()}
            >
              Save workspace identity
            </Button>
          </GlassCard>

          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Company profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Official contact, registration, tax IDs, and address.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["officialEmail", "Official email", "email"],
                  ["companyType", "Company type"],
                  ["industryType", "Industry type"],
                  ["registrationNumber", "Company registration number"],
                  ["incorporationDate", "Incorporation date", "text"],
                  ["companyPan", "Company PAN"],
                  ["tan", "TAN"],
                  ["gst", "GST"],
                  ["cin", "CIN"],
                  ["websiteUrl", "Website URL", "url"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="space-y-2 sm:col-span-1">
                  <Label htmlFor={`cp-${key}`}>{label}</Label>
                  <Input
                    id={`cp-${key}`}
                    type={type === "email" ? "email" : type === "url" ? "url" : "text"}
                    value={cp[key] ?? ""}
                    onChange={(e) => setCp((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={!canWrite}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cp-addr">Company address</Label>
                <textarea
                  id="cp-addr"
                  className={textareaClass}
                  value={cp.companyAddress ?? ""}
                  onChange={(e) => setCp((prev) => ({ ...prev, companyAddress: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveSection.isPending}
              onClick={() => saveSection.mutate({ companyProfile: cp })}
            >
              Save company profile
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="statutory" className="mt-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Statutory &amp; compliance</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["pfRegistrationNumber", "PF registration number"],
                  ["esicNumber", "ESIC number"],
                  ["professionalTaxNumber", "Professional tax number"],
                  ["tdsCircleWard", "TDS circle / ward"],
                  ["shopEstablishmentLicense", "Shop & establishment license"],
                  ["msmeNumber", "MSME number (optional)"],
                  ["startupIndiaRegistration", "Startup India registration (optional)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`st-${key}`}>{label}</Label>
                  <Input
                    id={`st-${key}`}
                    value={st[key] ?? ""}
                    onChange={(e) => setSt((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={!canWrite}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="st-lwf">Labour welfare fund details</Label>
                <textarea
                  id="st-lwf"
                  className={textareaClass}
                  value={st.labourWelfareFundDetails ?? ""}
                  onChange={(e) => setSt((prev) => ({ ...prev, labourWelfareFundDetails: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveSection.isPending}
              onClick={() => saveSection.mutate({ statutoryCompliance: st })}
            >
              Save statutory information
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Payroll configuration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Salary cycle, pay dates, currency, and policy toggles.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["salaryCycle", "Salary cycle", "e.g. Monthly"],
                  ["payDate", "Pay date", "e.g. Last working day"],
                  ["currency", "Currency", "INR"],
                  ["payrollFrequency", "Payroll frequency", "Monthly / Weekly"],
                  ["payrollStartMonth", "Payroll start month", "April"],
                  ["salaryComponents", "Salary components", "Basic, HRA, Bonus…"],
                ] as const
              ).map(([key, label, ph]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`py-${key}`}>{label}</Label>
                  <Input
                    id={`py-${key}`}
                    placeholder={ph}
                    value={py[key] ?? ""}
                    onChange={(e) => setPy((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={!canWrite}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={pyBool.variablePayEnabled}
                  onCheckedChange={(c) => setPyBool((b) => ({ ...b, variablePayEnabled: c === true }))}
                  disabled={!canWrite}
                />
                Variable pay enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={pyBool.overtimeEnabled}
                  onCheckedChange={(c) => setPyBool((b) => ({ ...b, overtimeEnabled: c === true }))}
                  disabled={!canWrite}
                />
                Overtime enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={pyBool.reimbursementEnabled}
                  onCheckedChange={(c) => setPyBool((b) => ({ ...b, reimbursementEnabled: c === true }))}
                  disabled={!canWrite}
                />
                Reimbursement enabled
              </label>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveSection.isPending}
              onClick={() => saveSection.mutate({ payrollConfiguration: { ...py, ...pyBool } })}
            >
              Save payroll configuration
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Document &amp; template settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Store template IDs, file paths, or merge tags reference (wire to document engine later).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["payslipTemplate", "Payslip template"],
                  ["offerLetterTemplate", "Offer letter template"],
                  ["appointmentLetterTemplate", "Appointment letter"],
                  ["salaryRevisionLetterTemplate", "Salary revision letter"],
                  ["experienceLetterTemplate", "Experience letter"],
                  ["form16Template", "Form 16 template"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`doc-${key}`}>{label}</Label>
                  <Input
                    id={`doc-${key}`}
                    value={doc[key] ?? ""}
                    onChange={(e) => setDoc((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={!canWrite}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveSection.isPending}
              onClick={() => saveSection.mutate({ documentTemplates: doc })}
            >
              Save document settings
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="saas" className="mt-4 space-y-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Tenant &amp; subscription (read-only)</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Tenant ID</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">{tenantId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Subscription plan</dt>
                <dd className="mt-0.5">{subscription?.planCode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Subscription status</dt>
                <dd className="mt-0.5">{subscription?.status ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current period ends</dt>
                <dd className="mt-0.5">
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Plan and billing source of truth lives in billing; limits below are workspace preferences / overrides you can persist in settings JSON.
            </p>
          </GlassCard>

          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">SaaS tenant preferences</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="saas-bill">Billing cycle (display)</Label>
                <Input
                  id="saas-bill"
                  value={saas.billingCycle ?? ""}
                  onChange={(e) => setSaas((s) => ({ ...s, billingCycle: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saas-users">Active users limit (text)</Label>
                <Input
                  id="saas-users"
                  value={saas.activeUsersLimit ?? ""}
                  onChange={(e) => setSaas((s) => ({ ...s, activeUsersLimit: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saas-stor">Storage limit</Label>
                <Input
                  id="saas-stor"
                  value={saas.storageLimit ?? ""}
                  onChange={(e) => setSaas((s) => ({ ...s, storageLimit: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saas-dom">Custom domain</Label>
                <Input
                  id="saas-dom"
                  value={saas.customDomain ?? ""}
                  onChange={(e) => setSaas((s) => ({ ...s, customDomain: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="saas-brand">Custom branding notes</Label>
                <textarea
                  id="saas-brand"
                  className={textareaClass}
                  value={saas.customBranding ?? ""}
                  onChange={(e) => setSaas((s) => ({ ...s, customBranding: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="saas-ff">Feature flags (JSON object)</Label>
                <textarea
                  id="saas-ff"
                  className={cn(textareaClass, "min-h-[120px] font-mono text-xs")}
                  value={featureFlagsJson}
                  onChange={(e) => setFeatureFlagsJson(e.target.value)}
                  disabled={!canWrite}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={saasBool.apiAccess}
                  onCheckedChange={(c) => setSaasBool((b) => ({ ...b, apiAccess: c === true }))}
                  disabled={!canWrite}
                />
                API access enabled (preference)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={saasBool.auditLogsEnabled}
                  onCheckedChange={(c) => setSaasBool((b) => ({ ...b, auditLogsEnabled: c === true }))}
                  disabled={!canWrite}
                />
                Audit logs (preference / retention flag)
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" disabled={!canWrite || saveSection.isPending} onClick={saveSaas}>
                Save SaaS preferences
              </Button>
              <Link
                href="/settings/api-keys"
                className={buttonVariants({ variant: "secondary" })}
              >
                API keys
              </Link>
              <Link href="/audit-logs" className={buttonVariants({ variant: "secondary" })}>
                Audit logs
              </Link>
              <Link href="/billing" className={buttonVariants({ variant: "secondary" })}>
                Billing
              </Link>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="organization" className="mt-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Organization structure</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage hierarchy and master data from dedicated settings pages.
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {orgLinks.map((item) => (
                <li key={item.label} className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    {item.required ? (
                      <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">Required</span>
                    ) : null}
                    {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
                  </div>
                  <Link href={item.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        </TabsContent>

        <TabsContent value="banking" className="mt-4">
          <GlassCard level={2}>
            <h2 className="text-lg font-semibold">Banking &amp; salary disbursement</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Company account used for payroll debits — same fields as employee bank details on payroll
              run.
            </p>
            <div className="mt-4 max-w-xl">
              <BankSalaryFields
                idPrefix="ws-bank"
                mode="company"
                disabled={!canWrite}
                values={bank}
                onChange={(patch) => setBank((b) => ({ ...b, ...patch }))}
              />
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={!canWrite || saveSection.isPending}
              onClick={() =>
                saveSection.mutate({
                  bankingDisbursement: {
                    bankName: bank.bankName.trim() || undefined,
                    companyBankAccount: bank.bankAccount.trim() || undefined,
                    ifsc: bank.ifsc.trim() || undefined,
                    salaryPaymentMethod: bank.salaryPaymentMethod,
                  },
                })
              }
            >
              Save banking settings
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationSettingsPanel value={notif} onChange={setNotif} />
          <div className="mt-4">
            <Link href="/settings/notifications" className={buttonVariants({ variant: "secondary" })}>
              Open notification center
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      {tenantQuery.isError ? (
        <p className="text-sm text-destructive">Could not load tenant. Check your network or permissions.</p>
      ) : null}
    </div>
  );
}
