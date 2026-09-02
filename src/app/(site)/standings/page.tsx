import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, EmptyState } from "@/components/ui";
import { StandingsTable } from "@/components/leagues/standings-table";
import { getAllLeagues, getLeagueStandings } from "@/components/leagues/queries";
import type { LeagueSummary } from "@/server/services/types";

export const metadata: Metadata = {
  title: "Bảng xếp hạng — Mọi giải đấu",
  description: "Bảng xếp hạng các giải đấu, cập nhật theo mùa giải.",
};

type Search = { searchParams: Promise<{ league?: string; team?: string }> };

function pickLeague(leagues: LeagueSummary[], slug?: string): LeagueSummary | undefined {
  return (slug && leagues.find((l) => l.slug === slug)) || leagues[0];
}

export default async function StandingsPage({ searchParams }: Search) {
  const { league: leagueSlug, team } = await searchParams;
  const leagues = await getAllLeagues();

  if (leagues.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <EmptyState title="Chưa có dữ liệu bảng xếp hạng." hint="Dữ liệu sẽ có sau khi các trận đấu kết thúc." />
      </div>
    );
  }

  const league = pickLeague(leagues, leagueSlug) ?? leagues[0]!;
  const rows = await getLeagueStandings(league.slug);
  const qs = (slug: string) => `?league=${slug}${team ? `&team=${team}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Bảng xếp hạng</h1>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          {leagues.map((l) => (
            <Link
              key={l.slug}
              href={`/standings${qs(l.slug)}`}
              className={
                l.slug === league.slug
                  ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                  : "rounded-full px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              }
            >
              {l.sport.emoji ? `${l.sport.emoji} ` : ""}
              {l.name}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`${league.name}${league.country ? ` — ${league.country}` : ""}`}
          action={
            <Link href={`/leagues/${league.slug}`} className="text-sm text-primary hover:underline">
              Trang giải đấu →
            </Link>
          }
        />
        <CardContent>
          <StandingsTable rows={rows} highlightTeamSlug={team} />
          <p className="mt-3 text-xs text-muted-foreground">
            Cột ↕: thay đổi hạng so với vòng trước. Ô xanh: vùng Champions League; đỏ: xuống hạng (áp dụng giải ≥ 18 đội).
            Hàng nổi bật theo <code>?team=</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
