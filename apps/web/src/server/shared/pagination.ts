import { BadRequestError } from "@sangam/api-kit";

export type OffsetPaginationQuery = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePaginationQuery(
  q: OffsetPaginationQuery,
  maxPageSize = 100,
): { skip: number; take: number; page: number; pageSize: number } {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number(q.pageSize) || 25),
  );
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize) || 0,
  };
}

export type CursorPaginationQuery = {
  cursor?: string;
  limit?: number;
};

export function parseCursorQuery(
  q: CursorPaginationQuery,
  maxLimit = 100,
): { cursor: string | undefined; limit: number } {
  const limit = Math.min(maxLimit, Math.max(1, Number(q.limit) || 25));
  return { cursor: q.cursor, limit };
}

export function decodeCursor(cursor: string): { id: string } {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const o = JSON.parse(json) as { id?: string };
    if (!o.id) throw new Error();
    return { id: o.id };
  } catch {
    throw new BadRequestError("Invalid cursor");
  }
}

export function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id }), "utf8").toString("base64url");
}
