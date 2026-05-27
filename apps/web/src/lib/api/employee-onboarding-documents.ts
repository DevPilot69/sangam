import { ApiError, getApiBaseUrl, pickErrorMessage } from "./client";

async function parseEnvelope<T>(res: Response): Promise<T> {
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new ApiError(pickErrorMessage(json, res.statusText), res.status, json);
  }
  if (json.success !== true) {
    throw new ApiError(pickErrorMessage(json, "Request failed"), res.status, json);
  }
  return json.data as T;
}

export const EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS = [
  { value: "PAN_CARD", label: "PAN card" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "ADDRESS_PROOF", label: "Address proof" },
  { value: "BANK_PROOF", label: "Bank proof / cancelled cheque" },
  { value: "PHOTOGRAPH", label: "Photograph" },
  { value: "OFFER_LETTER", label: "Offer letter" },
  { value: "EXPERIENCE_CERTIFICATE", label: "Experience certificate" },
  { value: "EDUCATION_CERTIFICATE", label: "Education certificate" },
  { value: "OTHER", label: "Other" },
] as const;

export type EmployeeOnboardingDocumentType =
  (typeof EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS)[number]["value"];

export type EmployeeOnboardingDocumentRow = {
  id: string;
  employeeId: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export function labelForEmployeeOnboardingDocumentType(code: string): string {
  const f = EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS.find((o) => o.value === code);
  return f?.label ?? code.replace(/_/g, " ").toLowerCase();
}

export async function fetchMeOnboardingDocuments(
  token: string
): Promise<EmployeeOnboardingDocumentRow[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/me/onboarding-documents`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return parseEnvelope<EmployeeOnboardingDocumentRow[]>(res);
}

export async function downloadMeOnboardingDocument(
  token: string,
  documentId: string,
  fallbackName: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/me/onboarding-documents/${documentId}/download`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
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
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchEmployeeOnboardingDocuments(
  token: string,
  employeeId: string
): Promise<EmployeeOnboardingDocumentRow[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/employees/${employeeId}/onboarding-documents`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return parseEnvelope<EmployeeOnboardingDocumentRow[]>(res);
}

export async function uploadEmployeeOnboardingDocument(
  token: string,
  employeeId: string,
  file: File,
  documentType: EmployeeOnboardingDocumentType
): Promise<EmployeeOnboardingDocumentRow> {
  const base = getApiBaseUrl();
  const fd = new FormData();
  fd.set("file", file);
  fd.set("documentType", documentType);
  const res = await fetch(`${base}/v1/employees/${employeeId}/onboarding-documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    credentials: "include",
  });
  return parseEnvelope<EmployeeOnboardingDocumentRow>(res);
}

export async function deleteEmployeeOnboardingDocument(
  token: string,
  employeeId: string,
  documentId: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/employees/${employeeId}/onboarding-documents/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  await parseEnvelope<{ deleted: boolean }>(res);
}

export async function fetchPlatformEmployeeOnboardingDocuments(
  token: string,
  tenantId: string,
  employeeId: string
): Promise<EmployeeOnboardingDocumentRow[]> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/employees/${employeeId}/onboarding-documents`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  return parseEnvelope<EmployeeOnboardingDocumentRow[]>(res);
}

export async function uploadPlatformEmployeeOnboardingDocument(
  token: string,
  tenantId: string,
  employeeId: string,
  file: File,
  documentType: EmployeeOnboardingDocumentType
): Promise<EmployeeOnboardingDocumentRow> {
  const base = getApiBaseUrl();
  const fd = new FormData();
  fd.set("file", file);
  fd.set("documentType", documentType);
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/employees/${employeeId}/onboarding-documents`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      credentials: "include",
    }
  );
  return parseEnvelope<EmployeeOnboardingDocumentRow>(res);
}

export async function deletePlatformEmployeeOnboardingDocument(
  token: string,
  tenantId: string,
  employeeId: string,
  documentId: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/employees/${employeeId}/onboarding-documents/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  await parseEnvelope<{ deleted: boolean }>(res);
}

export async function downloadPlatformEmployeeOnboardingDocument(
  token: string,
  tenantId: string,
  employeeId: string,
  documentId: string,
  fallbackName: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/employees/${employeeId}/onboarding-documents/${documentId}/download`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
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
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadEmployeeOnboardingDocument(
  token: string,
  employeeId: string,
  documentId: string,
  fallbackName: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/employees/${employeeId}/onboarding-documents/${documentId}/download`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
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
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}
