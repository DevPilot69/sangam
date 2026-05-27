import { z } from "zod";

export const ListAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  entityType: z.string().max(80).optional(),
});
export type ListAuditQueryDto = z.infer<typeof ListAuditQuerySchema>;
