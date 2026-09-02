import { adminStatsRepo } from "@/server/repositories/engagement.repo";
import { newsRepo } from "@/server/repositories/news.repo";
import { db } from "@/db";
import { jobRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Users, CalendarDays, Newspaper, Eye, Activity, MessageSquare } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { formatRelative } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [stats, pendingComments, recentJobs] = await Promise.all([
    adminStatsRepo.dashboard(),
    newsRepo.pendingCount(),
    db.select().from(jobRuns).orderBy(desc(jobRuns.id)).limit(8),
  ]);

  const cards = [
    { label: "Total users", value: stats.totalUsers, sub: `${stats.activeToday} mới 24h`, icon: Users },
    { label: "Matches today", value: stats.matchesToday, sub: `${stats.liveMatches} live`, icon: CalendarDays },
    { label: "News published", value: stats.newsPublished, sub: `${stats.newsToday} trong 24h`, icon: Newspaper },
    { label: "Total views", value: stats.totalViews.toLocaleString("vi-VN"), sub: "tất cả bài viết", icon: Eye },
    { label: "Live now", value: stats.liveMatches, sub: "đang diễn ra", icon: Activity },
    { label: "Pending comments", value: pendingComments, sub: "chờ duyệt", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-bold leading-none">{c.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.label} · {c.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Job runs (gần nhất)" />
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có job nào chạy (worker chưa start?).</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentJobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{j.jobName}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {j.durationMs}ms
                      <Badge variant={j.status === "ok" ? "success" : "warning"}>{j.status}</Badge>
                      <span className="hidden sm:inline">{formatRelative(j.createdAt.toISOString())}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Hệ thống" />
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Worker jobs: sync-matches, sync-standings, notify-upcoming, purge (mỗi 1–6h, xem Job runs).</p>
            <p>✓ SSE live engine: chạy trong worker khi deploy, hoặc web instance đầu tiên khi dev.</p>
            <p>✓ Moderation: Comments pending chờ duyệt; Reports open cần xử lý.</p>
            <p className="text-xs">Metrics nội bộ: <code>/api/internal/metrics</code> (guard METRICS_TOKEN).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
