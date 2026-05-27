/** Data access mode — production always uses `api`. */
export type DataSource = "api" | "msw";

export function getDataSource(): DataSource {
  const v = process.env.NEXT_PUBLIC_DATA_SOURCE?.toLowerCase();
  if (v === "msw") return "msw";
  return "api";
}

export const isApiDataSource = () => getDataSource() === "api";
