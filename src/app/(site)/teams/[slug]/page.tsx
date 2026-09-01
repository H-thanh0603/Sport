import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Card, CardContent, CardHeader, EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/teams/team-logo";
import { MatchList } from "@/components/teams/match-list";
import { SquadTable } from "@/components/teams/squad-table";
import { TabbedSections } from "@/components/teams/tabbed-sections";
import {
  getTeamBySlug,
  getTeamMatches,
  getTeamNews,
  getTeamSquad,
  getTeamStandings,
  getTeamStats,
} from "@/components/leagues/queries";
import { formatRelative } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) return { title: "Không tìm thấy đội" };
  return {
    title: `${team.name} — Lịch thi đấu, đội hình, thống kê`,
    description: `${team.name}${team.country ? ` (${team.country})` : ""} — kết quả, đội hình, thống kê mùa hiện tại.`,
  };
}

export default async function TeamPage({ params }: Params) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug).catch(() => null);
  if (!team) notFound();

  const [matches, squad, table, stats, teamNews] = await Promise.all([
    getTeamMatches(team.id),
    getTeamSquad(team.id),
    team.league ? getTeamStandings(team.league.slug, team.id) : Promise.resolve(null),
    team.league ? getTeamStats(team.league.slug, team.id) : Promise.resolve(null),
    getTeamNews(team.league?.slug ?? null),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <TeamLogo name={team.name} src={team.logoUrl} className="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{team.name}</h1>
              {team.sport.emoji ? <span aria-hidden>{team.sport.emoji}</span> : null}
              {table ? (
                <Badge variant="outline">
                  #{table.position} {team.league?.name}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {team.country ? <span>{team.country}</span> : null}
              {team.league ? (
                <Link href={`/leagues/${team.league.slug}`} className="hover:text-primary">
                  {team.league.name}
                </Link>
              ) : null}
              {team.venue ? <span>Sân {team.venue.name}{team.venue.city ? `, ${team.venue.city}` : ""}</span> : null}
              {team.foundedYear ? <span>Thành lập {team.foundedYear}</span> : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <TabbedSections
        tabs={[
          { key: "overview", label: "Tổng quan" },
          { key: "matches", label: "Lịch thi đấu" },
          { key: "results", label: "Kết quả" },
          { key: "squad", label: "Đội hình" },
          { key: "statistics", label: "Thống kê" },
          { key: "news", label: "Tin tức" },
        ]}
        sections={{
          overview: (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader title="Vị trí trên BXH" />
                <CardContent>
                  {table ? (
                    <ul className="space-y-1.5 text-sm">
                      <li>Hạng: <strong>{table.position}</strong></li>
                      <li>Điểm: <strong>{table.points}</strong> ({table.played} trận)</li>
                      <li className="pt-1">
                        <Link href={`/standings?league=${team.league?.slug}&team=${team.slug}`} className="text-primary hover:underline">
                          Xem bảng xếp hạng đầy đủ →
                        </Link>
                      </li>
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có dữ liệu BXH.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Phong độ mùa này" />
                <CardContent>
                  {stats ? (
                    <ul className="grid grid-cols-3 gap-2 text-center text-sm">
                      <li><div className="text-2xl font-bold text-success">{stats.won}</div>Thắng</li>
                      <li><div className="text-2xl font-bold text-warning">{stats.drawn}</div>Hòa</li>
                      <li><div className="text-2xl font-bold text-destructive">{stats.lost}</div>Bại</li>
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                  )}
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader title="Trận gần nhất" />
                <CardContent>
                  <MatchList matches={matches.results.slice(0, 5)} empty="Chưa có trận nào." />
                </CardContent>
              </Card>
            </div>
          ),
          matches: (
            <Card>
              <CardHeader title="Sắp diễn ra" />
              <CardContent>
                <MatchList matches={matches.upcoming} empty="Không có trận đấu sắp tới." />
              </CardContent>
            </Card>
          ),
          results: (
            <Card>
              <CardHeader title="Kết quả gần đây" />
              <CardContent>
                <MatchList matches={matches.results} empty="Chưa có kết quả." />
              </CardContent>
            </Card>
          ),
          squad: <SquadTable squad={squad} />,
          statistics: (
            <Card>
              <CardHeader title="Thống kê mùa giải" />
              <CardContent>
                {stats ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted-foreground">Số trận</dt><dd className="text-xl font-bold">{stats.played}</dd></div>
                    <div><dt className="text-muted-foreground">Thắng / Hòa / Thua</dt><dd className="text-xl font-bold">{stats.won} / {stats.drawn} / {stats.lost}</dd></div>
                    <div><dt className="text-muted-foreground">Ghi / thủng</dt><dd className="text-xl font-bold">{stats.goalsFor} / {stats.goalsAgainst}</dd></div>
                    <div><dt className="text-muted-foreground">Hiệu số</dt><dd className="text-xl font-bold">{stats.goalsFor - stats.goalsAgainst}</dd></div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu thống kê.</p>
                )}
              </CardContent>
            </Card>
          ),
          news:
            teamNews.length > 0 ? (
              <ul className="space-y-2">
                {teamNews.map((n) => (
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
              <EmptyState title="Chưa có tin liên quan." hint="Tin về giải đấu sẽ xuất hiện ở đây." />
            ),
        }}
      />
    </div>
  );
}
