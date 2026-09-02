import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/teams/team-logo";
import { MatchList } from "@/components/teams/match-list";
import { TabbedSections } from "@/components/teams/tabbed-sections";
import { StandingsTable } from "@/components/leagues/standings-table";
import { PlayerStatsChart } from "@/components/players/player-stats-chart";
import {
  getCurrentSeason,
  getLeagueBySlug,
  getLeagueMatches,
  getLeagueNews,
  getLeagueStandings,
  getLeagueTeams,
  getLeagueTopScorers,
} from "@/components/leagues/queries";
import { formatRelative } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);
  if (!league) return { title: "Không tìm thấy giải đấu" };
  return {
    title: `${league.name} — Lịch thi đấu, BXH, kết quả`,
    description: `${league.name}${league.country ? ` (${league.country})` : ""} — lịch thi đấu, kết quả, bảng xếp hạng.`,
  };
}

export default async function LeaguePage({ params }: Params) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug).catch(() => null);
  if (!league) notFound();

  const [matches, tableRows, teams, news, topScorers] = await Promise.all([
    getLeagueMatches(league.slug),
    getLeagueStandings(league.slug),
    getLeagueTeams(league.slug),
    getLeagueNews(league.slug),
    getLeagueTopScorers(league.id),
  ]);
  const season = await getCurrentSeason(league.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <TeamLogo name={league.name} src={league.logoUrl} className="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{league.name}</h1>
              {league.sport.emoji ? <span aria-hidden>{league.sport.emoji}</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[league.country, season ? `Mùa ${season.name}` : null, league.sport.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Link
            href={`/standings?league=${league.slug}`}
            className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            BXH đầy đủ →
          </Link>
        </CardContent>
      </Card>

      <TabbedSections
        tabs={[
          { key: "overview", label: "Tổng quan" },
          { key: "matches", label: "Lịch thi đấu" },
          { key: "results", label: "Kết quả" },
          { key: "standings", label: "BXH" },
          { key: "teams", label: "Đội" },
          { key: "statistics", label: "Thống kê" },
          { key: "news", label: "Tin tức" },
        ]}
        sections={{
          overview: (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader title="Trận sắp tới" />
                <CardContent>
                  <MatchList matches={matches.upcoming.slice(0, 5)} empty="Không có trận sắp tới." />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Kết quả gần nhất" />
                <CardContent>
                  <MatchList matches={matches.results.slice(0, 5)} empty="Chưa có kết quả." />
                </CardContent>
              </Card>
              {tableRows.length > 0 ? (
                <Card className="md:col-span-2">
                  <CardHeader title="Top BXH" />
                  <CardContent>
                    <StandingsTable rows={tableRows.slice(0, 5)} showZones={false} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ),
          matches: (
            <Card>
              <CardHeader title="Lịch thi đấu" />
              <CardContent>
                <MatchList matches={matches.upcoming} empty="Không có trận sắp tới." />
              </CardContent>
            </Card>
          ),
          results: (
            <Card>
              <CardHeader title="Kết quả" />
              <CardContent>
                <MatchList matches={matches.results} empty="Chưa có kết quả." />
              </CardContent>
            </Card>
          ),
          standings:
            tableRows.length > 0 ? (
              <StandingsTable rows={tableRows} />
            ) : (
              <EmptyState title="Chưa có BXH mùa này." hint="Dữ liệu cập nhật sau khi các trận đấu kết thúc." />
            ),
          teams: (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link href={`/teams/${t.slug}`} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50">
                    <TeamLogo name={t.name} src={t.logoUrl} className="h-8 w-8 text-sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.name}</span>
                      {t.country ? <span className="block text-xs text-muted-foreground">{t.country}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ),
          statistics: (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader title="Top ghi bàn" />
                <CardContent>
                  {topScorers.length > 0 ? (
                    <ol className="space-y-2">
                      {topScorers.map((s, i) => (
                        <li key={s.playerId} className="flex items-center gap-3 text-sm">
                          <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                          <Link href={`/players/${s.slug}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                            {s.name}
                            <span className="ml-1.5 text-xs text-muted-foreground">({s.teamName})</span>
                          </Link>
                          <span className="shrink-0 font-mono text-success">⚽ {s.goals}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu phong độ ghi bàn.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Tấn công mạnh nhất (theo BXH)" />
                <CardContent>
                  {tableRows.length > 0 ? (
                    <PlayerStatsChart
                      stats={tableRows.slice(0, 8).map((r) => ({ label: r.team.shortName ?? r.team.name, value: r.goalsFor }))}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu BXH.</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Tổng bàn thắng ghi được mùa này, top 8 đội.</p>
                </CardContent>
              </Card>
            </div>
          ),
          news:
            news.length > 0 ? (
              <ul className="space-y-2">
                {news.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/news/${n.slug}`} className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50">
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.publishedAt ? formatRelative(n.publishedAt) : ""} · {n.readingMinutes} phút đọc
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Chưa có tin về giải này." />
            ),
        }}
      />
    </div>
  );
}
