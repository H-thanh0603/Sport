import { route, ok } from "@/server/http/api";
import { db } from "@/db";
import { sports } from "@/db/schema";
import { asc } from "drizzle-orm";
import { cached } from "@/server/cache";

export const GET = route(async () => {
  const data = await cached("v1:sports:all", 3600, () =>
    db
      .select({ slug: sports.slug, name: sports.name, emoji: sports.emoji })
      .from(sports)
      .orderBy(asc(sports.id)),
  );
  return ok(data);
});
