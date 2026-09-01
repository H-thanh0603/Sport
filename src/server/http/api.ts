import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/server/logger";

/* ── response envelope ──────────────────────────────────── */

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200): Response {
  return Response.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function created<T>(data: T, meta?: Record<string, unknown>): Response {
  return ok(data, meta, 201);
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

/* ── api errors ────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (entity: string) =>
  new ApiError(404, `${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found`);

/* ── route wrapper: validation → handler → error envelope ── */

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    const start = Date.now();
    try {
      const res = await handler(req, ctx);
      logger.info("api", {
        method: req.method,
        path: req.nextUrl.pathname,
        status: res.status,
        ms: Date.now() - start,
      });
      return res;
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.status, error.code, error.message, error.details);
      }
      if (error instanceof ZodError) {
        return fail(400, "VALIDATION_ERROR", "Invalid input", error.flatten().fieldErrors);
      }
      logger.error("api unhandled", {
        method: req.method,
        path: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}

/* ── pagination ─────────────────────────────────────────── */

export function parsePagination(url: URL, defaults = { page: 1, perPage: 20, maxPerPage: 50 }) {
  const page = Math.max(1, Number(url.searchParams.get("page")) || defaults.page);
  const perPageRaw = Number(url.searchParams.get("perPage")) || defaults.perPage;
  const perPage = Math.min(Math.max(1, perPageRaw), defaults.maxPerPage);
  return { page, perPage, offset: (page - 1) * perPage };
}

export function paginationMeta(page: number, perPage: number, total: number) {
  return {
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      hasNext: page * perPage < total,
    },
  };
}

/* ── request helpers ───────────────────────────────────── */

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Same-origin check for state-changing requests (CSRF defense for cookie auth). */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser or same-site GET-like requests
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export async function jsonBody<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}
