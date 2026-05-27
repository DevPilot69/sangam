import { ApiError, getApiBaseUrl, pickErrorMessage } from "./client";
import type { TenantLegalDocumentRow, TenantLegalDocumentType } from "@/lib/legal-document-types";

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

export async function fetchTenantLegalDocuments(token: string): Promise<TenantLegalDocumentRow[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/tenant/legal-documents`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return parseEnvelope<TenantLegalDocumentRow[]>(res);
}

export async function uploadTenantLegalDocument(
  token: string,
  file: File,
  documentType: TenantLegalDocumentType
): Promise<TenantLegalDocumentRow> {
  const base = getApiBaseUrl();
  const fd = new FormData();
  fd.set("file", file);
  fd.set("documentType", documentType);
  const res = await fetch(`${base}/v1/tenant/legal-documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    credentials: "include",
  });
  return parseEnvelope<TenantLegalDocumentRow>(res);
}

export async function deleteTenantLegalDocument(token: string, documentId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/tenant/legal-documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  await parseEnvelope<{ deleted: boolean }>(res);
}

export async function downloadTenantLegalDocument(
  token: string,
  documentId: string,
  fallbackName: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/tenant/legal-documents/${documentId}/download`,
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

export async function fetchPlatformTenantLegalDocuments(
  token: string,
  tenantId: string
): Promise<TenantLegalDocumentRow[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/platform/tenants/${tenantId}/legal-documents`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return parseEnvelope<TenantLegalDocumentRow[]>(res);
}

export async function uploadPlatformTenantLegalDocument(
  token: string,
  tenantId: string,
  file: File,
  documentType: TenantLegalDocumentType
): Promise<TenantLegalDocumentRow> {
  const base = getApiBaseUrl();
  const fd = new FormData();
  fd.set("file", file);
  fd.set("documentType", documentType);
  const res = await fetch(`${base}/v1/platform/tenants/${tenantId}/legal-documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    credentials: "include",
  });
  return parseEnvelope<TenantLegalDocumentRow>(res);
}

export async function deletePlatformTenantLegalDocument(
  token: string,
  tenantId: string,
  documentId: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/legal-documents/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  await parseEnvelope<{ deleted: boolean }>(res);
}

export async function downloadPlatformTenantLegalDocument(
  token: string,
  tenantId: string,
  documentId: string,
  fallbackName: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/v1/platform/tenants/${tenantId}/legal-documents/${documentId}/download`,
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
