import { apiFetchJson } from "./client";
import type { PaymentDocumentItem } from "./payment-documents";

export type TenantPaymentStatus = "PAID" | "UNPAID" | "OVERDUE" | "WAIVED";

export type PlatformTelemetry = {
  tenants: number;
  users: number;
  employees: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  payrollRunsDisbursed: number;
  pendingLeaveRequests: number;
  newTenantsLast30Days: number;
  estimatedMrrInr: number;
  totalMonthlyServerCostInr: number;
  totalMonthlyMarginInr: number;
  paidTenants: number;
  unpaidTenants: number;
  overdueTenants: number;
  planBreakdown: Record<string, number>;
  recentTenants: {
    id: string;
    slug: string;
    name: string;
    createdAt: string;
    employeeCount: number;
    userCount: number;
    subscriptionStatus: string | null;
    planCode: string | null;
    paymentStatus: string | null;
    monthlyMarginInr: number | null;
  }[];
};

export type PlatformBillingOverview = {
  tenantCount: number;
  totalMonthlyRevenueInr: number;
  totalMonthlyServerCostInr: number;
  totalMonthlyMarginInr: number;
  paidTenants: number;
  unpaidTenants: number;
  overdueTenants: number;
  waivedTenants: number;
};

export type PlatformTenantBillingRow = {
  tenantId: string;
  slug: string;
  name: string;
  employeeCount: number;
  subscriptionStatus: string | null;
  planCode: string | null;
  currentPeriodEnd: string | null;
  monthlyFeeInr: number;
  monthlyServerCostInr: number;
  monthlyMarginInr: number;
  marginPercent: number;
  paymentStatus: TenantPaymentStatus;
  lastPaidAt: string | null;
  billingNotes: string | null;
  isPaidThisCycle: boolean;
  currentInvoice: {
    id: string;
    amount: number;
    status: string;
    paidAt: string | null;
  } | null;
};

export type TenantLiveStatus = "LIVE" | "TRIAL" | "SETUP" | "PAST_DUE" | "CHURNED";

export type PlatformTenantRow = {
  id: string;
  slug: string;
  companyCode: string | null;
  name: string;
  industry: string | null;
  country: string;
  createdAt: string;
  onboardedAt: string | null;
  onboardingComplete: boolean;
  liveStatus: TenantLiveStatus;
  employeeCount: number;
  userCount: number;
  payrollRunCount: number;
  subscription: {
    status: string;
    planCode: string | null;
    currentPeriodEnd: string | null;
  } | null;
  billing: {
    paymentStatus: TenantPaymentStatus;
    monthlyFeeInr: number;
    monthlyServerCostInr: number;
    monthlyMarginInr: number;
    lastPaidAt: string | null;
  } | null;
};

export type ProvisionTenantPayload = {
  name: string;
  legalName?: string;
  companyCode?: string;
  slug?: string;
  industry?: string;
  country?: string;
  settings?: Record<string, unknown>;
  planCode?: string;
  subscriptionStatus?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  trialDays?: number;
  monthlyFeeInr?: number;
  monthlyServerCostInr?: number;
  paymentStatus?: TenantPaymentStatus;
  billingNotes?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  verifyAdminEmail?: boolean;
  departmentName?: string;
  departmentCode?: string;
  designationTitle?: string;
  markOnboardingComplete?: boolean;
};

export type ProvisionTenantResult = {
  id: string;
  slug: string;
  name: string;
  loginUrl: string;
  liveStatus: TenantLiveStatus;
  admin: { email: string; name: string; emailVerified: boolean };
  message: string;
};

export async function fetchPlatformTelemetry(token: string) {
  return apiFetchJson<PlatformTelemetry>("/v1/platform/telemetry/summary", {
    method: "GET",
    token,
  });
}

export async function fetchPlatformTenants(token: string, search?: string) {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetchJson<PlatformTenantRow[]>(`/v1/platform/tenants${q}`, {
    method: "GET",
    token,
  });
}

export type PlatformTenantDetail = {
  id: string;
  slug: string;
  companyCode: string | null;
  name: string;
  legalName: string | null;
  industry: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompletedAt: string | null;
  liveStatus: TenantLiveStatus;
  settings: Record<string, unknown>;
  workspaceSettings: { pan: string | null; payDay: number | null };
  counts: {
    employees: number;
    users: number;
    departments: number;
    payrollRuns: number;
    leaveRequests: number;
    auditLogs: number;
    activeEmployees: number;
  };
  subscription: {
    id: string;
    status: string;
    planCode: string | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    razorpayConfigured: boolean;
  } | null;
  billing: {
    paymentStatus: TenantPaymentStatus;
    monthlyFeeInr: number;
    monthlyServerCostInr: number;
    monthlyMarginInr: number;
    lastPaidAt: string | null;
    billingNotes: string | null;
  } | null;
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    periodYear: number | null;
    periodMonth: number | null;
    paidAt: string | null;
    createdAt: string;
    pdfUrl: string | null;
    canDownload: boolean;
  }[];
  lastPayroll: {
    id: string;
    periodYear: number;
    periodMonth: number;
    status: string;
  } | null;
  tenantAdmins: { email: string; name: string; since: string }[];
  legalDocuments: {
    id: string;
    documentType: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  paymentDocuments: PaymentDocumentItem[];
};

export async function fetchPlatformTenantDetail(token: string, id: string) {
  return apiFetchJson<PlatformTenantDetail>(`/v1/platform/tenants/${id}`, {
    method: "GET",
    token,
  });
}

export async function patchPlatformTenantOperationalStatus(
  token: string,
  tenantId: string,
  operationalStatus: TenantLiveStatus
) {
  return apiFetchJson<{ liveStatus: TenantLiveStatus; subscriptionStatus: string }>(
    `/v1/platform/tenants/${tenantId}/operational-status`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ operationalStatus }),
    }
  );
}

function getApiBaseUrl(): string {
  // Empty (unset) -> same-origin / relative URLs (production: Next.js +
  // API on Vercel). Setting an explicit value still works (e.g. for
  // pointing a dev front-end at a remote API).
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export async function downloadPlatformTenantInvoice(
  token: string,
  tenantId: string,
  invoiceId: string,
  filename: string
) {
  const res = await fetch(
    `${getApiBaseUrl()}/v1/platform/tenants/${tenantId}/invoices/${invoiceId}/download`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = (await res.json()) as { error?: { message?: string } };
      message = json?.error?.message ?? message;
    } catch {
      /* binary or empty */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchPlatformBillingOverview(token: string) {
  return apiFetchJson<PlatformBillingOverview>("/v1/platform/billing/overview", {
    method: "GET",
    token,
  });
}

export async function fetchPlatformBillingTenants(
  token: string,
  params?: { search?: string; paymentStatus?: TenantPaymentStatus }
) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<PlatformTenantBillingRow[]>(`/v1/platform/billing/tenants${suffix}`, {
    method: "GET",
    token,
  });
}

export async function checkPlatformTenantSlug(token: string, slug: string) {
  return apiFetchJson<{ slug: string; available: boolean }>(
    `/v1/platform/tenants/check-slug?slug=${encodeURIComponent(slug)}`,
    { method: "GET", token }
  );
}

export async function provisionPlatformTenant(token: string, body: ProvisionTenantPayload) {
  return apiFetchJson<ProvisionTenantResult>("/v1/platform/tenants", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function patchPlatformTenantBilling(
  token: string,
  tenantId: string,
  body: {
    monthlyFeeInr?: number;
    monthlyServerCostInr?: number;
    paymentStatus?: TenantPaymentStatus;
    lastPaidAt?: string;
    billingNotes?: string;
  }
) {
  return apiFetchJson<PlatformTenantBillingRow>(`/v1/platform/billing/tenants/${tenantId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}
