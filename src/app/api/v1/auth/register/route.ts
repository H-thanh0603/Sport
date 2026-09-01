import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { route, created, fail } from "@/server/http/api";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { issueEmailToken } from "@/server/auth/email";
import { clientIp, isSameOrigin, jsonBody } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";

const schema = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Chỉ chữ thường, số, gạch dưới"),
  displayName: z.string().min(2).max(64),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-zA-Z]/, "Cần ít nhất 1 chữ")
    .regex(/[0-9]/, "Cần ít nhất 1 số"),
});

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) {
    return fail(403, "CSRF", "Cross-origin request rejected");
  }
  const ip = clientIp(req);
  const rl = await rateLimit("auth:register", ip, 5, 3600);
  if (!rl.allowed) {
    return fail(429, "RATE_LIMITED", "Quá nhiều lần đăng ký. Thử lại sau.");
  }

  const body = await jsonBody(req).catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.error.flatten().fieldErrors);
  }
  const { email, username, displayName, password } = parsed.data;

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (emailTaken) return fail(409, "EMAIL_TAKEN", "Email đã được sử dụng");
  const [nameTaken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (nameTaken) return fail(409, "USERNAME_TAKEN", "Tên đăng nhập đã được sử dụng");

  const [row] = await db
    .insert(users)
    .values({
      email,
      username,
      displayName,
      passwordHash: await hashPassword(password),
    })
    .returning({ id: users.id });

  await issueEmailToken(row!.id, "verify_email", email);
  await createSession(row!.id);
  return created({ id: row!.id, username, email });
});
