import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatMatchTime, formatScore, statusLabel } from "@/lib/format";
import type { MatchWithTeams } from "@/components/leagues/queries";

function statusVariant(status: MatchWithTeams["status"]): "live" | "success" | "warning" | "muted" {
  switch (status) {
    case "live": case "halftime": return "live";
    case "finished": return "success";
    case "postponed": case "cancelled": return "warning";
    default: return "muted";
  }
}

export function MatchListItem({ match }: { match: MatchWithTeams }) {
  const live = match.status === "live" || match.status === "halftime";
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50"
    >
      <div className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
        {match.league.name}
      </div>
      <div className="flex w-full min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {match.homeTeam.name} <span className="text-muted-foreground">vs</span> {match.awayTeam.name}
        </span>
        <span className={`shrink-0 font-mono text-sm font-bold ${live ? "text-live" : ""}`}>
          {formatScore(match)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {live && match.minute !== null ? (
          <span className="font-mono text-xs text-live">{match.minute}&apos;</span>
        ) : null}
        <Badge variant={statusVariant(match.status)}>{statusLabel(match.status)}</Badge>
        <span className="hidden w-16 text-right text-xs text-muted-foreground md:block">
          {formatMatchTime(match.startTime)}
        </span>
      </div>
    </Link>
  );
}

export function MatchList({ matches, empty }: { matches: MatchWithTeams[]; empty: string }) {
  if (matches.length === 0) return <p className="px-1 py-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {matches.map((m) => (
        <li key={m.id}>
          <MatchListItem match={m} />
        </li>
      ))}
    </ul>
  );
}
