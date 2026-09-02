"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { qs } from "./qs";
import { api } from "@/lib/api-client";
import { addDays, formatDayNav, utcDayKey } from "./helpers";
import { MatchCard } from "./match-card";
import type { MatchWithTeams } from "@/server/services/types";
import { Button, Card, CardContent, CardHeader, EmptyState, ErrorState, Skeleton } from "@/components/ui";

export function ResultsView() {
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, -1 = yesterday
  const date = utcDayKey(addDays(new Date(), dayOffset));

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["results", date],
    queryFn: () => api.get<MatchWithTeams[]>(`/matches${qs({ status: "finished", mode: "results", date, perPage: 100 })}`),
  });

  const grouped = useMemo(() => {
    const byLeague = new Map<string, MatchWithTeams[]>();
    for (const m of data ?? []) {
      if (!byLeague.has(m.league.name)) byLeague.set(m.league.name, []);
      byLeague.get(m.league.name)!.push(m);
    }
    return [...byLeague.entries()];
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck aria-hidden className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Kết quả</h1>
      </div>

      {/* date navigation */}
      <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Chọn ngày">
        <Button variant="outline" size="sm" aria-label="Ngày trước" onClick={() => setDayOffset((d) => d - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDayOffset(0)} disabled={dayOffset === 0}>
          {formatDayNav(addDays(new Date(), dayOffset))}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Ngày sau"
          onClick={() => setDayOffset((d) => Math.min(0, d + 1))}
          disabled={dayOffset >= 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent>
            <ErrorState onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="Không có kết quả trong ngày này." hint="Chọn ngày khác bằng nút điều hướng." />
          </CardContent>
        </Card>
      ) : (
        grouped.map(([leagueName, matches]) => (
          <Card key={leagueName}>
            <CardHeader title={leagueName} />
            <CardContent className="space-y-2">
              {matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
