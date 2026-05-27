import { ApiError, apiFetchJson, getApiBaseUrl, pickErrorMessage } from "./client";

export type PaymentDocumentItem =
  | {
      kind: "SUBSCRIPTION";
      id: string;
      title: string;
      periodLabel: string;
      amountInr: number;
      currency: string;
      status: string;
      createdAt: string;
      paidAt: string | null;
      pdfFilename: string;
    }
  | {
      kind: "PAYROLL";
      id: string;
      title: string;
      periodLabel: string;
      amountInr: number;
      currency: string;
      status: string;
      createdAt: string;
      employeeCount: number;
      grossInr: number;
      deductionsInr: number;
      pdfFilename: string;
    };

export async function fetchTenantPaymentDocuments(token: string): Promise<PaymentDocumentItem[]> {
  return apiFetchJson<PaymentDocumentItem[]>("/v1/billing/payment-documents", {
    method: "GET",
    token,
  });
}

async function downloadPdf(path: string, token: string, filename: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) {
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* binary */
    }
    throw new ApiError(pickErrorMessage(json, res.statusText), res.status, json);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTenantSubscriptionPdf(
  token: string,
  invoiceId: string,
  filename: string
): Promise<void> {
  return downloadPdf(
    `/v1/billing/payment-documents/subscription/${invoiceId}/pdf`,
    token,
    filename
  );
}

export async function downloadTenantPayrollPdf(
  token: string,
  payrollRunId: string,
  filename: string
): Promise<void> {
  return downloadPdf(
    `/v1/billing/payment-documents/payroll/${payrollRunId}/pdf`,
    token,
    filename
  );
}

export async function fetchPlatformTenantPaymentDocuments(
  token: string,
  tenantId: string
): Promise<PaymentDocumentItem[]> {
  return apiFetchJson<PaymentDocumentItem[]>(
    `/v1/platform/tenants/${tenantId}/payment-documents`,
    { method: "GET", token }
  );
}

export async function downloadPlatformSubscriptionPdf(
  token: string,
  tenantId: string,
  invoiceId: string,
  filename: string
): Promise<void> {
  return downloadPdf(
    `/v1/platform/tenants/${tenantId}/payment-documents/subscription/${invoiceId}/pdf`,
    token,
    filename
  );
}

export async function downloadPlatformPayrollPdf(
  token: string,
  tenantId: string,
  payrollRunId: string,
  filename: string
): Promise<void> {
  return downloadPdf(
    `/v1/platform/tenants/${tenantId}/payment-documents/payroll/${payrollRunId}/pdf`,
    token,
    filename
  );
}
