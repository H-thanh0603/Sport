import Link from "next/link";
import { Badge } from "@/components/ui";
import { TeamLogo } from "@/components/sports/team-logo";
import { cn } from "@/lib/utils";
import { formatKickoffTime } from "./helpers";
import { formatMatchTime, formatScore } from "@/lib/format";
import type { MatchWithTeams } from "@/server/services/types";

function StatusBadge({ status, minute }: { status: string; minute: number | null }) {
  if (status === "live" || status === "halftime") {
    return (
      <Badge variant="live" className="animate-pulse-live">
        {status === "halftime" ? "HT" : `LIVE ${minute ?? ""}`.trim()}
      </Badge>
    );
  }
  if (status === "finished") return <Badge variant="muted">FT</Badge>;
  if (status === "postponed") return <Badge variant="warning">Hoãn</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Hủy</Badge>;
  return null;
}

/** Compact match row — used in live/upcoming/results/schedule lists. */
export function MatchCard({ match, className }: { match: MatchWithTeams; className?: string }) {
  const hasScores = match.homeScore !== null && match.awayScore !== null;
  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TeamLogo name={match.homeTeam.name} src={match.homeTeam.logoUrl} />
        <span className="truncate text-sm font-medium">{match.homeTeam.shortName ?? match.homeTeam.name}</span>
        <span
          className={cn(
            "shrink-0 px-2 text-sm font-bold tabular-nums",
            hasScores && (match.status === "live" || match.status === "halftime") && "animate-score-bump",
          )}
        >
          {formatScore(match)}
        </span>
        <span className="truncate text-sm font-medium">{match.awayTeam.shortName ?? match.awayTeam.name}</span>
        <TeamLogo name={match.awayTeam.name} src={match.awayTeam.logoUrl} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={match.status} minute={match.minute} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {match.status === "scheduled" ? formatKickoffTime(match.startTime) : formatMatchTime(match.startTime)}
        </span>
      </div>
    </Link>
  );
}
