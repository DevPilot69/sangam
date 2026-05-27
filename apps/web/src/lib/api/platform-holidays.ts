import { apiFetchJson } from "./client";
import type { HolidayRow } from "./holidays";

export async function fetchPlatformHolidays(token: string, year: number) {
  return apiFetchJson<HolidayRow[]>(`/v1/platform/holidays?year=${year}`, {
    method: "GET",
    token,
  });
}

export async function upsertPlatformHolidays(
  token: string,
  holidays: { date: string; name: string }[]
) {
  return apiFetchJson<{ upserted: number; holidays: HolidayRow[] }>("/v1/platform/holidays", {
    method: "POST",
    token,
    body: JSON.stringify({ holidays }),
  });
}

export async function updatePlatformHoliday(
  token: string,
  id: string,
  body: { date?: string; name?: string }
) {
  return apiFetchJson<HolidayRow>(`/v1/platform/holidays/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deletePlatformHoliday(token: string, id: string) {
  return apiFetchJson<{ id: string; deleted: boolean }>(`/v1/platform/holidays/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchPlatformTenantHolidays(
  token: string,
  tenantId: string,
  year: number
) {
  return apiFetchJson<HolidayRow[]>(
    `/v1/platform/tenants/${tenantId}/holidays?year=${year}`,
    { method: "GET", token }
  );
}

export async function upsertPlatformTenantHolidays(
  token: string,
  tenantId: string,
  holidays: { date: string; name: string }[]
) {
  return apiFetchJson<{ upserted: number; holidays: HolidayRow[] }>(
    `/v1/platform/tenants/${tenantId}/holidays`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ holidays }),
    }
  );
}

export async function updatePlatformTenantHoliday(
  token: string,
  tenantId: string,
  id: string,
  body: { date?: string; name?: string }
) {
  return apiFetchJson<HolidayRow>(`/v1/platform/tenants/${tenantId}/holidays/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deletePlatformTenantHoliday(
  token: string,
  tenantId: string,
  id: string
) {
  return apiFetchJson<{ id: string; deleted: boolean }>(
    `/v1/platform/tenants/${tenantId}/holidays/${id}`,
    { method: "DELETE", token }
  );
}
