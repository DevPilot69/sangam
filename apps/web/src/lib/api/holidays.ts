import { apiFetchJson } from "./client";

export type HolidayRow = {
  id: string;
  date: string;
  name: string;
  source: "platform" | "tenant";
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchTenantHolidays(token: string, year: number) {
  return apiFetchJson<HolidayRow[]>(`/v1/tenant/holidays?year=${year}`, {
    method: "GET",
    token,
  });
}

export async function upsertTenantHolidays(
  token: string,
  holidays: { date: string; name: string }[]
) {
  return apiFetchJson<{ upserted: number; holidays: HolidayRow[] }>("/v1/tenant/holidays", {
    method: "POST",
    token,
    body: JSON.stringify({ holidays }),
  });
}

export async function updateTenantHoliday(
  token: string,
  id: string,
  body: { date?: string; name?: string }
) {
  return apiFetchJson<HolidayRow>(`/v1/tenant/holidays/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteTenantHoliday(token: string, id: string) {
  return apiFetchJson<{ id: string; deleted: boolean }>(`/v1/tenant/holidays/${id}`, {
    method: "DELETE",
    token,
  });
}
