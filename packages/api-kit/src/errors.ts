/**
 * Typed error classes that map 1-to-1 to Nest's HttpException subclasses.
 *
 * Throw these inside services; the `withApi` wrapper (see envelope.ts) catches
 * them and emits the same JSON shape NestJS's HttpExceptionFilter produced.
 */

export class ApiError extends Error {
  /**
   * Original message form. Preserved so `withApi` can emit `message: string[]`
   * (matching Nest's ValidationPipe envelope) vs a plain string verbatim.
   */
  public readonly messageRaw: string | string[];

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string | string[],
    public readonly details?: unknown,
  ) {
    super(Array.isArray(message) ? message.join(", ") : message);
    this.name = "ApiError";
    this.messageRaw = message;
  }

  /** Multi-message variant — Nest's ValidationPipe emits `message: string[]`. */
  static validation(messages: string[], details?: unknown): ApiError {
    return new ApiError(400, "Bad Request", messages, details);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string | string[] = "Bad Request", details?: unknown) {
    super(400, "Bad Request", message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, "Unauthorized", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, "Forbidden", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not Found") {
    super(404, "Not Found", message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(409, "Conflict", message);
    this.name = "ConflictError";
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message = "Unprocessable Entity", details?: unknown) {
    super(422, "Unprocessable Entity", message, details);
    this.name = "UnprocessableEntityError";
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = "Too Many Requests") {
    super(429, "Too Many Requests", message);
    this.name = "TooManyRequestsError";
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_ERROR", message);
    this.name = "InternalServerError";
  }
}

export class BadGatewayError extends ApiError {
  constructor(message = "Bad Gateway") {
    super(502, "Bad Gateway", message);
    this.name = "BadGatewayError";
  }
}
