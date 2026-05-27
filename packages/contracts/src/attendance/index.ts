import { z } from "zod";

export const ATTENDANCE_PRESETS = [
  "today",
  "yesterday",
  "week",
  "month",
  "range",
] as const;
export type AttendancePreset = (typeof ATTENDANCE_PRESETS)[number];

export const ATTENDANCE_STATUS_FILTERS = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "WFH",
] as const;
export type AttendanceStatusFilter = (typeof ATTENDANCE_STATUS_FILTERS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/attendance, GET /v1/attendance/summary

export const AttendanceQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  employeeId: z.string().optional(),
  search: z.string().optional(),
  date: z.string().optional(),
  month: z.string().optional(),
  preset: z.enum(ATTENDANCE_PRESETS).optional(),
  status: z.enum(ATTENDANCE_STATUS_FILTERS).optional(),
});
export type AttendanceQueryDto = z.infer<typeof AttendanceQuerySchema>;
