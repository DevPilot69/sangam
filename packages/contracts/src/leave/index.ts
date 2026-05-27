import { z } from "zod";

const LEAVE_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/leave/requests — list query

export const ListLeaveQuerySchema = z.object({
  status: z.enum(LEAVE_REQUEST_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListLeaveQueryDto = z.infer<typeof ListLeaveQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/leave/requests/[id]/status

export const PatchLeaveStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
export type PatchLeaveStatusDto = z.infer<typeof PatchLeaveStatusSchema>;
