import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// PATCH /v1/me/profile
export const PatchMeProfileSchema = z.object({
  phone: z.string().max(32).optional(),
  phoneAlt: z.string().max(32).optional(),
});
export type PatchMeProfileDto = z.infer<typeof PatchMeProfileSchema>;

// POST /v1/me/leave/requests
export const CreateLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: isoDate,
  endDate: isoDate,
  reason: z.string().max(500).optional(),
});
export type CreateLeaveDto = z.infer<typeof CreateLeaveSchema>;

// GET /v1/me/attendance — from/to optional
export const MeAttendanceQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type MeAttendanceQueryDto = z.infer<typeof MeAttendanceQuerySchema>;

// GET /v1/me/attendance/month
export const MeAttendanceMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export type MeAttendanceMonthQueryDto = z.infer<
  typeof MeAttendanceMonthQuerySchema
>;

// GET /v1/me/holidays
export const MeHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type MeHolidaysQueryDto = z.infer<typeof MeHolidaysQuerySchema>;

// GET /v1/me/attendance/summary
export const MeAttendanceSummaryQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type MeAttendanceSummaryQueryDto = z.infer<
  typeof MeAttendanceSummaryQuerySchema
>;
