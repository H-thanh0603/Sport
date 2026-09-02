"use client";

import { useQuery } from "@tanstack/react-query";
import { Goal, Hand, Repeat, ShieldAlert, Timer } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui";
import { StatsComparisonChart } from "@/components/charts/stats-comparison";
import { TeamLogo } from "@/components/sports/team-logo";
import { cn } from "@/lib/utils";
import { formatKickoffTime } from "./helpers";
import { formatScore } from "@/lib/format";
import { api } from "@/lib/api-client";
import type { MatchDetail, MatchEvent } from "@/server/services/types";

/* ── Timeline ────────────────────────────────────────────── */

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  goal: Goal,
  penalty: Goal,
  yellow_card: ShieldAlert,
  red_card: Hand,
  substitution: Repeat,
  var: ShieldAlert,
};

function EventRow({ ev }: { ev: MatchEvent }) {
  const Icon = EVENT_ICON[ev.type] ?? Timer;
  const isHome = ev.teamSlug !== null;
  return (
    <li className={cn("flex items-start gap-3 py-2", !isHome && "opacity-100")}>
      <span className="w-10 shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-muted-foreground">
        {ev.minute}'
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          ev.type === "goal" || ev.type === "penalty"
            ? "bg-success/15 text-success"
            : ev.type === "red_card"
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-sm">
        <span className="font-medium">{ev.teamName ?? ""}</span>
        {ev.detail ? <span className="text-muted-foreground"> — {ev.detail}</span> : null}
        {ev.type === "var" ? <BadgeVar /> : null}
      </p>
    </li>
  );
}

function BadgeVar() {
  return <span className="ml-1.5 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">VAR</span>;
}

export function TimelineTab({ matchId }: { matchId: number }) {
  const { data, isPending } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
  });
  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (!data || data.events.length === 0) return <EmptyState title="Chưa có sự kiện trong trận." />;
  return (
    <ol className="divide-y divide-border">
      {data.events.map((ev) => (
        <EventRow key={ev.id} ev={ev} />
      ))}
    </ol>
  );
}

/* ── Statistics (Recharts bar) ───────────────────────────── */

export function StatisticsTab({ statistics }: { statistics: MatchDetail["statistics"] }) {
  if (statistics.length === 0) return <EmptyState title="Chưa có thống kê." />;
  return <StatsComparisonChart statistics={statistics} />;
}

/* ── Lineups: pitch SVG + bench + coach ──────────────────── */

function Pitch({ lineup }: { lineup: MatchDetail["lineups"][number] }) {
  const starters = lineup.players.slice(0, 11);
  const bench = lineup.players.slice(11);
  return (
    <div className="space-y-2">
      <p className="text-center text-sm font-semibold">
        {lineup.teamName}
        {lineup.formation ? <span className="ml-1.5 text-xs text-muted-foreground">({lineup.formation})</span> : null}
      </p>
      <svg viewBox="0 0 68 105" className="mx-auto w-full max-w-72 rounded-lg bg-gradient-to-b from-success/20 to-success/5" role="img" aria-label={`Sơ đồ đội hình ${lineup.teamName}`}>
        {/* pitch lines */}
        <rect x="2" y="2" width="64" height="101" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
        <circle cx="34" cy="52.5" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
        <rect x="18" y="2" width="32" height="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
        <rect x="18" y="93" width="32" height="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
        {/* players */}
        {starters.map((p) => (
          <g key={p.playerId}>
            <circle cx={p.x} cy={p.y} r="3.4" className="fill-primary" />
            <text x={p.x} y={p.y + 1.1} textAnchor="middle" fontSize="2.6" fontWeight="700" className="fill-primary-foreground">
              {p.shirtNumber ?? ""}
            </text>
            <text x={p.x} y={p.y + 6.8} textAnchor="middle" fontSize="2.4" className="fill-foreground">
              {p.name.split(" ").at(-1) ?? p.name}
            </text>
          </g>
        ))}
      </svg>
      {bench.length > 0 && (
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Dự bị ({bench.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {bench.map((p) => (
              <li key={p.playerId} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-xs font-bold text-muted-foreground tabular-nums">{p.shirtNumber ?? ""}</span>
                {p.name}
                {p.position ? <span className="text-xs text-muted-foreground">({p.position})</span> : null}
              </li>
            ))}
          </ul>
        </details>
      )}
      {lineup.coachName ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TeamLogo name={lineup.teamName} /> HLV: <span className="font-medium text-foreground">{lineup.coachName}</span>
        </p>
      ) : null}
    </div>
  );
}

export function LineupsTab({ lineups }: { lineups: MatchDetail["lineups"] }) {
  if (!lineups || lineups.length === 0) return <EmptyState title="Chưa có thông tin đội hình." />;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {lineups.map((l) => (
        <Pitch key={l.teamId} lineup={l} />
      ))}
    </div>
  );
}

/* ── H2H ─────────────────────────────────────────────────── */

export function H2HTab({ h2h }: { h2h: MatchDetail["h2h"] }) {
  if (!h2h || (h2h.summary.total === 0 && h2h.recent.length === 0)) {
    return <EmptyState title="Chưa có dữ liệu đối đầu." />;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-success/10 p-3">
          <p className="text-2xl font-bold text-success tabular-nums">{h2h.summary.homeWin}</p>
          <p className="text-xs text-muted-foreground">Thắng chủ</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-2xl font-bold tabular-nums">{h2h.summary.draw}</p>
          <p className="text-xs text-muted-foreground">Hòa</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-2xl font-bold text-destructive tabular-nums">{h2h.summary.awayWin}</p>
          <p className="text-xs text-muted-foreground">Thắng khách</p>
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">5 trận gần nhất</h4>
        <ul className="space-y-2">
          {h2h.recent.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{formatKickoffTime(m.startTime)}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{m.homeTeam.shortName ?? m.homeTeam.name}</span> vs{" "}
                <span className="font-medium">{m.awayTeam.shortName ?? m.awayTeam.name}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatScore(m)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Commentary ──────────────────────────────────────────── */

export function CommentaryTab({ matchId }: { matchId: number }) {
  const { data, isPending } = useQuery({
    queryKey: ["match", matchId, "commentary"],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
  });
  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (!data || data.commentary.length === 0) return <EmptyState title="Chưa có tường thuật." />;
  return (
    <ol className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
      {data.commentary.map((c, i) => (
        <li key={i} className="relative flex gap-4">
          <span className="z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
            {c.minute ?? "•"}
          </span>
          <p className="pt-2 text-sm leading-relaxed">{c.text}</p>
        </li>
      ))}
    </ol>
  );
}
