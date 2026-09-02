import type { MetadataRoute } from "next";
import { db } from "@/db";
import { leagues, news, teams } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

/** Sitemap — static routes + leagues + teams + published news. Chunked ≤45k URLs per file when large. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [leagueRows, teamRows, newsRows] = await Promise.all([
    db.select({ slug: leagues.slug }).from(leagues).limit(500),
    db.select({ slug: teams.slug }).from(teams).limit(5000),
    db
      .select({ slug: news.slug, updatedAt: news.updatedAt })
      .from(news)
      .where(eq(news.status, "published"))
      .orderBy(desc(news.publishedAt))
      .limit(5000),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/schedule`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/results`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/standings`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/register`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...leagueRows.map((l) => ({ url: `${BASE}/leagues/${l.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...teamRows.map((t) => ({ url: `${BASE}/teams/${t.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...newsRows.map((n) => ({
      url: `${BASE}/news/${n.slug}`,
      lastModified: n.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

