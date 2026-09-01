import { hash, verify } from "@node-rs/argon2";

/** Argon2id — recommended params (RFC 9106). */
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashStr, plain, OPTS);
  } catch {
    return false;
  }
}
