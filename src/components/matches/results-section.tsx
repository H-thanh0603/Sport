"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Trophy } from "lucide-react";
import { qs } from "./qs";
import { api } from "@/lib/api-client";
import { MatchCard } from "./match-card";
import { Card, CardContent, CardHeader, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { TeamLogo } from "@/components/sports/team-logo";
import Link from "next/link";
import type { LeagueSummary, MatchWithTeams } from "@/server/services/types";

/** Latest results — finished matches, latest first. */
export function ResultsSection() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["matches", "results", "latest"],
    queryFn: () =>
      api
        .get<MatchWithTeams[]>(`/api/v1/matches${qs({ status: "finished", mode: "results", perPage: 6 })}`),
  });
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarCheck aria-hidden className="h-4 w-4 text-muted-foreground" /> Kết quả mới nhất
          </span>
        }
        action={
          <Link href="/results" className="text-xs font-medium text-primary hover:underline">
            Xem tất cả
          </Link>
        }
      />
      <CardContent className="space-y-2">
        {isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Chưa có kết quả." />
        ) : (
          data.map((m) => <MatchCard key={m.id} match={m} />)
        )}
      </CardContent>
    </Card>
  );
}

/** Popular leagues (isPopular) — grid of league chips. */
export function PopularLeaguesSection() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["leagues", "popular"],
    queryFn: () =>
      api
        .get<LeagueSummary[]>("/api/v1/leagues")
        .then((all) => all.filter((l) => l.isPopular).slice(0, 8)),
  });
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Trophy aria-hidden className="h-4 w-4 text-primary" /> Giải đấu nổi bật
          </span>
        }
      />
      <CardContent>
        {isPending ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Chưa có giải đấu." />
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {data.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/leagues/${l.slug}`}
                  className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 transition-colors hover:bg-accent/50"
                >
                  <TeamLogo name={l.name} src={l.logoUrl} />
                  <span className="truncate text-sm font-medium">{l.name}</span>
                  {l.country ? <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{l.country}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
