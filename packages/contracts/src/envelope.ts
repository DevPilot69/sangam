import { z } from "zod";

/**
 * Response envelope contract — replicates the shape produced by the original
 * Nest `TransformResponseInterceptor` and consumed by the frontend client at
 * `apps/web/src/lib/api/client.ts`.
 *
 * Success:  { success: true,  data: T,                          timestamp }
 * Failure:  { success: false, error: { code, message, details?}, timestamp, requestId }
 */

export const SuccessEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    timestamp: z.string(),
  });

export const ErrorEnvelope = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.union([z.string(), z.array(z.string())]),
    details: z.unknown().optional(),
  }),
  timestamp: z.string(),
  requestId: z.string(),
});

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  timestamp: string;
};

export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** Standard error codes emitted by the API (mirrors NestJS HttpException defaults). */
export const ERROR_CODES = {
  BadRequest: "Bad Request",
  Unauthorized: "Unauthorized",
  Forbidden: "Forbidden",
  NotFound: "Not Found",
  Conflict: "Conflict",
  UnprocessableEntity: "Unprocessable Entity",
  TooManyRequests: "Too Many Requests",
  Internal: "INTERNAL_ERROR",
} as const;
