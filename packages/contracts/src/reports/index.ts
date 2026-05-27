import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/reports/run

export const RunReportSchema = z.object({
  reportId: z.string().min(1),
  filters: z.record(z.string(), z.union([z.string(), z.number()])),
});
export type RunReportDto = z.infer<typeof RunReportSchema>;
