"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { qs } from "./qs";
import { MatchCard } from "./match-card";
import { useLive, type LiveMessage } from "@/lib/use-live";
import { Card, CardContent, CardHeader, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import type { MatchWithTeams } from "@/server/services/types";

/** LIVE NOW section — realtime scores via SSE topic `home` (§5.3). */
export function LiveNowSection() {
  const queryClient = useQueryClient();
  const [bump, setBump] = useState<Record<number, boolean>>({});

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["matches", "live"],
    queryFn: () => api.get<MatchWithTeams[]>(`/matches${qs({ status: ["live", "halftime"] })}`),
    refetchInterval: 60_000,
  });

  useLive(["home"], (msg: LiveMessage) => {
    if (msg.type === "score" || msg.type === "status" || msg.type === "event") {
      queryClient.invalidateQueries({ queryKey: ["matches", "live"] });
      const p = msg.payload as { matchId?: number };
      if (msg.type === "score" && typeof p.matchId === "number") {
        setBump((b) => ({ ...b, [p.matchId as number]: true }));
      }
    }
  });

  // clear bump animation after it plays
  useEffect(() => {
    const ids = Object.entries(bump)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (ids.length === 0) return;
    const t = setTimeout(() => {
      setBump({});
    }, 600);
    return () => clearTimeout(t);
  }, [bump]);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Radio aria-hidden className="h-4 w-4 text-live" />
            Live Now
          </span>
        }
      />
      <CardContent className="space-y-2">
        {isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Không có trận đấu trực tiếp." hint="Hãy quay lại sau — trận đấu sẽ bắt đầu sớm thôi." />
        ) : (
          data.map((m) => <MatchCard key={m.id} match={m} className={bump[m.id] ? "animate-score-bump" : undefined} />)
        )}
      </CardContent>
    </Card>
  );
}
