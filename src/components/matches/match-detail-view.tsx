"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { CommentaryTab, H2HTab, LineupsTab, StatisticsTab, TimelineTab } from "./match-tabs";
import { useLive, type LiveMessage } from "@/lib/use-live";
import { Badge, Card, CardContent, ErrorState, Spinner, Tabs } from "@/components/ui";
import { TeamLogo } from "@/components/sports/team-logo";
import { cn } from "@/lib/utils";
import { formatKickoffTime } from "./helpers";
import { formatScore, statusLabel } from "@/lib/format";
import type { MatchDetail } from "@/server/services/types";

export function MatchDetailView({ matchId }: { matchId: number }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("timeline");

  const { data: match, isPending, isError, refetch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
  });

  // realtime: score/minute/status/events via SSE topic match:{id} — no page reload
  useLive([`match:${matchId}`], (msg: LiveMessage) => {
    if (msg.type === "score" || msg.type === "status" || msg.type === "stats" || msg.type === "event") {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      if (msg.type === "status") {
        const p = msg.payload as { status?: string };
        if (p.status === "finished") {
          // standings/stats may have changed
          queryClient.invalidateQueries({ queryKey: ["match", matchId] });
        }
      }
    }
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError || !match) {
    return (
      <Card>
        <CardContent>
          <ErrorState message="Không tìm thấy trận đấu." onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  const isLive = match.status === "live" || match.status === "halftime";

  return (
    <div className="space-y-4">
      {/* header */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {match.sport.emoji} {match.league.name}
            </span>
            {isLive ? (
              <Badge variant="live" className="animate-pulse-live">
                {match.status === "halftime" ? "HT" : `LIVE ${match.minute ?? ""}`.trim()}
              </Badge>
            ) : (
              <Badge variant={match.status === "finished" ? "muted" : "outline"}>{statusLabel(match.status)}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamLogo name={match.homeTeam.name} src={match.homeTeam.logoUrl} className="h-10 w-10 text-sm" />
              <span className="truncate text-sm font-bold sm:text-base">{match.homeTeam.name}</span>
            </div>
            <span
              className={cn(
                "shrink-0 px-2 text-2xl font-bold tabular-nums sm:text-3xl",
                isLive && "animate-score-bump",
              )}
            >
              {formatScore(match)}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-bold sm:text-base">{match.awayTeam.name}</span>
              <TeamLogo name={match.awayTeam.name} src={match.awayTeam.logoUrl} className="h-10 w-10 text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Start: {formatKickoffTime(match.startTime)}</span>
            {match.venue ? (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden className="h-3.5 w-3.5" />
                {match.venue.name}
                {match.venue.city ? `, ${match.venue.city}` : ""}
              </span>
            ) : null}
            {match.postponedReason ? <span className="text-warning">Lý do hoãn: {match.postponedReason}</span> : null}
          </div>
        </CardContent>
      </Card>

      {/* tabs */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { key: "timeline", label: "Diễn biến" },
          { key: "statistics", label: "Thống kê" },
          { key: "lineups", label: "Đội hình" },
          { key: "h2h", label: "Đối đầu" },
          { key: "commentary", label: "Tường thuật" },
        ]}
      />
      <Card>
        <CardContent>
          {tab === "timeline" && <TimelineTab matchId={matchId} />}
          {tab === "statistics" && <StatisticsTab statistics={match.statistics} />}
          {tab === "lineups" && <LineupsTab lineups={match.lineups} />}
          {tab === "h2h" && <H2HTab h2h={match.h2h} />}
          {tab === "commentary" && <CommentaryTab matchId={matchId} />}
        </CardContent>
      </Card>
    </div>
  );
}
