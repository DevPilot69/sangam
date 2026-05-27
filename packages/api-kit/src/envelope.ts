import { NextRequest, NextResponse } from "next/server";
import { ApiError, BadGatewayError } from "./errors";

/**
 * Wraps a Route Handler with:
 *
 *  - Response envelope        { success: true,  data, timestamp }
 *  - Error envelope           { success: false, error: { code, message, details? }, timestamp, requestId }
 *  - Request-id propagation   echoes `x-request-id` or generates a UUID
 *  - Demo simulation header   `x-demo-error: 500|502` -> throws BadGatewayError
 *  - Demo latency             DEMO_LATENCY_MS env adds artificial delay
 *
 * Matches the original NestJS behaviour in:
 *   - src/shared/interceptors/transform-response.interceptor.ts
 *   - src/shared/filters/http-exception.filter.ts
 *   - src/shared/interceptors/demo-simulation.interceptor.ts
 *   - src/shared/interceptors/request-id.interceptor.ts
 *
 * Handler return values:
 *   - `undefined` / `null` / plain object  -> wrapped in success envelope
 *   - a `Response` / `NextResponse`       -> returned verbatim (escape hatch
 *                                            for file downloads, redirects)
 *   - throws ApiError                      -> error envelope w/ correct status
 *   - throws anything else                 -> 500 error envelope, message safe
 */

export type RouteHandler<Ctx = unknown> = (
  req: NextRequest,
  ctx: Ctx,
) => Promise<unknown> | unknown;

const isProd = () => process.env.NODE_ENV === "production";

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function applyDemoBehaviour(req: NextRequest): Promise<void> {
  const demo = req.headers.get("x-demo-error");
  if (demo === "500" || demo === "502") {
    throw new BadGatewayError("Simulated API failure (x-demo-error)");
  }
  const delay = Number(process.env.DEMO_LATENCY_MS ?? 0);
  if (Number.isFinite(delay) && delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }
}

export function withApi<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    const requestId = req.headers.get("x-request-id") ?? generateRequestId();
    const timestamp = nowIso();

    try {
      await applyDemoBehaviour(req);

      const result = await handler(req, ctx);

      // Escape hatch: handler returned a raw Response (downloads, redirects).
      if (result instanceof Response) {
        if (!result.headers.has("x-request-id")) {
          result.headers.set("x-request-id", requestId);
        }
        return result;
      }

      return NextResponse.json(
        { success: true, data: result ?? null, timestamp },
        { status: 200, headers: { "x-request-id": requestId } },
      );
    } catch (err) {
      return errorEnvelope(err, requestId, timestamp);
    }
  };
}

function errorEnvelope(
  err: unknown,
  requestId: string,
  timestamp: string,
): Response {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message: string | string[] = "Internal server error";
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.messageRaw;
    details = err.details;
  } else if (err instanceof Error) {
    // In non-prod surface the real message; in prod stay generic.
    if (!isProd()) message = err.message;
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(isProd() ? {} : { details }),
      },
      timestamp,
      requestId,
    },
    { status, headers: { "x-request-id": requestId } },
  );
}
