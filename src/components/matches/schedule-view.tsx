"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Filter } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { qs } from "./qs";
import { api } from "@/lib/api-client";
import { formatDayNav, utcDayKey } from "./helpers";
import { MatchCard } from "./match-card";
import type { LeagueSummary, MatchStatus, MatchWithTeams } from "@/server/services/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const STATUS_CHIPS: { key: MatchStatus; label: string }[] = [
  { key: "live", label: "LIVE" },
  { key: "scheduled", label: "UPCOMING" },
  { key: "finished", label: "FINISHED" },
  { key: "postponed", label: "POSTPONED" },
  { key: "cancelled", label: "CANCELLED" },
];

const SPORTS = ["", "football", "basketball", "tennis", "badminton", "volleyball", "esports"];

export function ScheduleView() {
  const [sport, setSport] = useState("");
  const [league, setLeague] = useState("");
  const [date, setDate] = useState("");
  const [statuses, setStatuses] = useState<MatchStatus[]>([]);
  const [teamQuery, setTeamQuery] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");

  const { data: leagues } = useQuery({
    queryKey: ["leagues", sport || "all"],
    queryFn: () => api.get<LeagueSummary[]>(`/api/v1/leagues${qs({ sport })}`),
  });

  const { data: teamOptions } = useQuery({
    queryKey: ["teams", "search", teamQuery],
    queryFn: () => api.get<{ id: number; name: string }[]>(`/api/v1/teams${qs({ q: teamQuery, perPage: 8 })}`),
    enabled: teamQuery.trim().length >= 2,
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["schedule", sport, league, date, statuses.join(","), teamId],
    queryFn: () =>
      api.get<MatchWithTeams[]>(
        `/matches${qs({
          sport: sport || undefined,
          league: league || undefined,
          date: date || undefined,
          status: statuses.length ? statuses : undefined,
          teamId: teamId ?? undefined,
          perPage: 100,
        })}`,
      ),
  });

  // group by day → league
  const grouped = useMemo(() => {
    const days = new Map<string, Map<string, MatchWithTeams[]>>();
    for (const m of data ?? []) {
      const day = utcDayKey(new Date(m.startTime));
      if (!days.has(day)) days.set(day, new Map());
      const byLeague = days.get(day)!;
      if (!byLeague.has(m.league.name)) byLeague.set(m.league.name, []);
      byLeague.get(m.league.name)!.push(m);
    }
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const toggleStatus = (s: MatchStatus) =>
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays aria-hidden className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Lịch thi đấu</h1>
      </div>

      {/* filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Môn"
              name="sport"
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                setLeague("");
              }}
              options={SPORTS.map((s) => ({
                value: s,
                label: s === "" ? "Tất cả môn" : s.charAt(0).toUpperCase() + s.slice(1),
              }))}
            />
            <Select
              label="Giải đấu"
              name="league"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              options={[
                { value: "", label: "Tất cả giải" },
                ...(leagues ?? []).map((l) => ({ value: l.slug, label: l.name })),
              ]}
            />
            <Input
              label="Ngày (YYYY-MM-DD)"
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
            <div className="relative w-56">
              <Input
                label="Đội bóng"
                name="team"
                placeholder="Tìm đội…"
                value={teamId ? teamName : teamQuery}
                onChange={(e) => {
                  setTeamQuery(e.target.value);
                  setTeamId(null);
                  setTeamName("");
                }}
              />
              {teamId ? (
                <button
                  type="button"
                  aria-label="Bỏ chọn đội"
                  onClick={() => {
                    setTeamId(null);
                    setTeamName("");
                    setTeamQuery("");
                  }}
                  className="absolute right-2 top-8 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              ) : !teamQuery || (teamOptions && teamOptions.length === 0) ? null : (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
                  {(teamOptions ?? []).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setTeamId(t.id);
                          setTeamName(t.name);
                          setTeamQuery("");
                        }}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSport("");
                setLeague("");
                setDate("");
                setStatuses([]);
                setTeamId(null);
                setTeamName("");
                setTeamQuery("");
              }}
            >
              Xóa lọc
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Trạng thái">
            <Filter aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
            {STATUS_CHIPS.map((c) => {
              const active = statuses.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleStatus(c.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* results grouped by day → league */}
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
            <EmptyState
              title="Không có trận đấu khớp bộ lọc."
              hint="Thử bỏ lọc ngày hoặc đổi môn thể thao."
              action={
                <Link href="/schedule" className="text-sm font-medium text-primary hover:underline">
                  Xem tất cả
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        grouped.map(([day, byLeague]) => (
          <section key={day} aria-label={`Trận đấu ngày ${day}`}>
            <h2 className="mb-2 text-sm font-bold text-muted-foreground uppercase">{formatDayNav(new Date(`${day}T12:00:00Z`))}</h2>
            <div className="space-y-3">
              {[...byLeague.entries()].map(([leagueName, matches]) => (
                <Card key={leagueName}>
                  <CardHeader title={leagueName} />
                  <CardContent className="space-y-2">
                    {matches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
      {data && data.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">{data.length} trận</p>
      )}
    </div>
  );
}
