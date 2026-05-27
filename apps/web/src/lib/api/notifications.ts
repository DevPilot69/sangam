import { apiFetchJson } from "./client";

export type ApiNotification = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(
  token: string,
  params?: { limit?: number }
): Promise<ApiNotification[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<ApiNotification[]>(`/v1/notifications${suffix}`, { method: "GET", token });
}

export async function markNotificationRead(token: string, id: string): Promise<ApiNotification> {
  return apiFetchJson<ApiNotification>(`/v1/notifications/${id}/read`, {
    method: "PATCH",
    token,
    body: JSON.stringify({}),
  });
}
