// Shared client helpers cho auth forms — Gói B.
// Gọi API trực tiếp bằng fetch (api-client của A chưa merge).
"use client";

import type { FormEvent } from "react";

export const AUTH_API = "/api/v1/auth";

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function postJson<T>(url: string, body: Record<string, unknown>): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ success: false, error: { code: "NETWORK", message: "Lỗi kết nối." } }))) as ApiEnvelope<T>;
}

export function getErrorMessage(env: ApiEnvelope, fallback: string): string {
  return env.error?.message ?? fallback;
}

export function preventDefault(fn: () => void) {
  return (e: FormEvent) => {
    e.preventDefault();
    fn();
  };
}
