import type { Metadata } from "next";
import { MatchDetailView } from "@/components/matches/match-detail-view";
import { matchesService } from "@/server/services/matches.service";

type Props = { params: Promise<{ id: string }> };

/**
 * Shell is static-friendly: data comes from client queries + SSE.
 * Live matches stay realtime via `useLive`; finished matches benefit
 * from ISR 300s on the cached shell + metadata.
 * ponytail: if the shell ever embeds server data, split live/finished
 * into separate routes (live → force-dynamic).
 */
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) return { title: "Trận đấu — Sport" };
  const detail = await matchesService.getMatchDetail(matchId);
  if (!detail) return { title: "Trận đấu — Sport" };
  const title = `${detail.homeTeam.name} vs ${detail.awayTeam.name} — Sport`;
  return {
    title,
    description: `${detail.league.name}: tỷ số, diễn biến, thống kê, đội hình.`,
    alternates: { canonical: `/matches/${matchId}` },
  };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-center text-muted-foreground">ID trận đấu không hợp lệ.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <MatchDetailView matchId={matchId} />
    </div>
  );
}
