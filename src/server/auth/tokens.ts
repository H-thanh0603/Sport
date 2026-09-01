import { createHash, randomBytes } from "crypto";

/** Random url-safe token (raw). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Store only SHA-256 of tokens in DB. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Timing-safe comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
