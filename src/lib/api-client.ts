/** Typed API client for client components — envelope-aware fetch wrapper. */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Envelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

async function request<T>(
  path: string,
  init?: RequestInit & { retryOn503?: boolean },
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json || json.success === false) {
    const err = json && json.success === false ? json.error : { code: "NETWORK", message: res.statusText };
    throw new ApiError(err.code, err.message, res.status, "details" in err ? err.details : undefined);
  }
  return { data: json.data, meta: json.meta };
}

export const api = {
  get: <T>(path: string) => request<T>(path).then((r) => r.data),
  getWithMeta: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
