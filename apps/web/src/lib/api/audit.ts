import { apiFetchJson } from "./client";

export type ApiAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  diff: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

export async function fetchAuditLogs(
  token: string,
  params?: { limit?: number; entityType?: string }
): Promise<ApiAuditLog[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.entityType) q.set("entityType", params.entityType);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<ApiAuditLog[]>(`/v1/audit-logs${suffix}`, { method: "GET", token });
}
