import type { NextRequest } from "next/server";
import type { z, ZodError, ZodTypeAny } from "zod";
import { ApiError } from "./errors";

/**
 * Validates a payload against a Zod schema. Throws `ApiError` (400, "Bad Request")
 * with the SAME shape NestJS's global ValidationPipe produced when
 * `class-validator` violations were thrown.
 *
 * Original behaviour from `src/main.ts:39-46`:
 *
 *     new ValidationPipe({
 *       whitelist: true,
 *       forbidNonWhitelisted: true,
 *       transform: true,
 *       transformOptions: { enableImplicitConversion: true },
 *     });
 *
 * Concretely we emit:
 *   {
 *     success: false,
 *     error: {
 *       code: "Bad Request",
 *       message: [ "<field> <reason>", ... ],
 *       details: { ... zodError.flatten() ... }
 *     }
 *   }
 *
 * The `message` ARRAY (not string) shape is critical — the frontend's
 * `pickErrorMessage` (apps/web/src/lib/api/client.ts) joins it with "; " for
 * the toast banner. Single-element arrays still render correctly.
 */
export async function validate<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): Promise<z.infer<S>> {
  const result = schema.safeParse(input);
  if (result.success) return result.data as z.infer<S>;
  throw zodToApiError(result.error);
}

function zodToApiError(error: ZodError): ApiError {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "";
    const prefix = path ? `${path} ` : "";
    messages.push(`${prefix}${issue.message}`);
  }
  return ApiError.validation(messages, error.flatten());
}

/** Convenience: parse a Next.js request body (JSON) against a schema. */
export async function validateJson<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw ApiError.validation(["body must be valid JSON"]);
  }
  return validate(schema, body);
}

/**
 * Validates a UUID path param. Throws `ApiError` 400 if missing/invalid
 * (matching Nest's ParseUUIDPipe behaviour).
 *
 * Usage in App Router dynamic routes:
 *
 *   export const GET = withApi(async (req, { params }) => {
 *     const { id } = await params;
 *     const employeeId = parseUuidParam(id, "id");
 *     return employeesService.get(user.tenantId, employeeId);
 *   });
 */
export function parseUuidParam(value: unknown, name = "id"): string {
  if (typeof value !== "string" || value.length === 0) {
    throw ApiError.validation([`${name} must be a string`]);
  }
  // RFC 4122 UUID (any version)
  if (
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  ) {
    throw ApiError.validation([
      `Validation failed (uuid is expected)`,
    ]);
  }
  return value;
}

/** Convenience: parse the search params of a Next.js request against a schema. */
export async function validateQuery<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  const obj: Record<string, string | string[]> = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    const existing = obj[key];
    if (existing === undefined) {
      obj[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      obj[key] = [existing, value];
    }
  }
  return validate(schema, obj);
}
