import { z } from "zod";

export const ListNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListNotificationsQueryDto = z.infer<
  typeof ListNotificationsQuerySchema
>;
