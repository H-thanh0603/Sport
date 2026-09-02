"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { qs } from "./qs";
import { api } from "@/lib/api-client";
import { useLive, type LiveMessage } from "@/lib/use-live";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { TeamLogo } from "@/components/sports/team-logo";
import { cn } from "@/lib/utils";
import { formatKickoffTime } from "./helpers";
import { formatRelative, formatScore, statusLabel } from "@/lib/format";
import type { MatchWithTeams, NewsCard } from "@/server/services/types";

/* ── Hero carousel: featured matches + breaking news ─────── */

function HeroSlide({ match }: { match: MatchWithTeams }) {
  const [live, setLive] = useState(match);
  useLive([`match:${match.id}`], (msg: LiveMessage) => {
    if (msg.type === "score") {
      const p = msg.payload as Pick<MatchWithTeams, "homeScore" | "awayScore" | "minute" | "status">;
      setLive((cur) => ({ ...cur, ...p }));
    }
  });
  return (
    <Link
      href={`/matches/${live.id}`}
      className="flex min-h-44 flex-col justify-between gap-4 rounded-lg bg-gradient-to-br from-primary/15 via-card to-card p-5 animate-fade-in"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          {live.sport.emoji} {live.league.name}
        </span>
        {live.status === "live" || live.status === "halftime" ? (
          <Badge variant="live" className="animate-pulse-live">
            {live.status === "halftime" ? "HT" : `LIVE ${live.minute ?? ""}`.trim()}
          </Badge>
        ) : (
          <Badge variant="outline">{statusLabel(live.status)}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo name={live.homeTeam.name} src={live.homeTeam.logoUrl} className="h-8 w-8 text-xs" />
          <span className="truncate text-sm font-semibold">{live.homeTeam.name}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{formatScore(live)}</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">{live.awayTeam.name}</span>
          <TeamLogo name={live.awayTeam.name} src={live.awayTeam.logoUrl} className="h-8 w-8 text-xs" />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock aria-hidden className="h-3.5 w-3.5" />
        {live.status === "scheduled" ? `Bắt đầu lúc ${formatKickoffTime(live.startTime)}` : formatRelative(live.startTime)}
      </p>
    </Link>
  );
}

export function HeroCarousel() {
  const [slide, setSlide] = useState(0);
  const { data: live } = useQuery({
    queryKey: ["matches", "live"],
    queryFn: () => api.get<MatchWithTeams[]>(`/matches${qs({ status: ["live", "halftime"] })}`),
  });
  const { data: breaking } = useQuery({
    queryKey: ["news", "breaking"],
    queryFn: () => api.get<NewsCard[]>(`/news${qs({ breaking: "true", perPage: 3 })}`),
  });

  const matchSlides = (live ?? []).slice(0, 3);
  const newsSlides = (breaking ?? []).slice(0, 2);
  const slides = [...matchSlides.map((m) => ({ kind: "match" as const, m })), ...newsSlides.map((n) => ({ kind: "news" as const, n }))];

  if (slides.length === 0) return null;
  const cur = slides[Math.min(slide, slides.length - 1)]!;

  return (
    <section aria-label="Nổi bật" className="relative">
      {cur.kind === "match" ? (
        <HeroSlide match={cur.m} />
      ) : (
        <Link
          href={`/news/${cur.n.slug}`}
          className="flex min-h-44 flex-col justify-between gap-3 rounded-lg bg-gradient-to-br from-destructive/15 via-card to-card p-5 animate-fade-in"
        >
          <Badge variant="live" className="w-fit">
            <Flame aria-hidden className="h-3 w-3" /> Breaking
          </Badge>
          <h2 className="line-clamp-2 text-lg font-bold">{cur.n.title}</h2>
          <p className="line-clamp-1 text-sm text-muted-foreground">{cur.n.excerpt}</p>
          <p className="text-xs text-muted-foreground">
            {cur.n.category.name} · {cur.n.publishedAt ? formatRelative(cur.n.publishedAt) : ""}
          </p>
        </Link>
      )}
      {slides.length > 1 && (
        <div className="absolute right-3 top-3 flex gap-1">
          <Button variant="outline" size="sm" aria-label="Slide trước" onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" aria-label="Slide sau" onClick={() => setSlide((s) => (s + 1) % slides.length)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5" role="tablist" aria-label="Chọn slide">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === Math.min(slide, slides.length - 1)}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={cn("h-1.5 rounded-full transition-all", i === slide ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Upcoming with Today/Tomorrow/This Week chips ─────────── */

const WINDOWS = [
  { key: "today", label: "Hôm nay" },
  { key: "tomorrow", label: "Ngày mai" },
  { key: "week", label: "Tuần này" },
] as const;

export function UpcomingSection() {
  const [win, setWin] = useState<(typeof WINDOWS)[number]["key"]>("today");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["matches", "upcoming", win],
    queryFn: () => api.get<MatchWithTeams[]>(`/matches${qs({ status: "scheduled", mode: "upcoming", window: win, perPage: 8 })}`),
  });

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Clock aria-hidden className="h-4 w-4 text-muted-foreground" /> Sắp diễn ra
          </span>
        }
        action={
          <div className="flex gap-1" role="tablist" aria-label="Chọn khung thời gian">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                role="tab"
                aria-selected={win === w.key}
                onClick={() => setWin(w.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  win === w.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />
      <CardContent className="space-y-2">
        {isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Không có trận đấu trong khung thời gian này." />
        ) : (
          data.map((m) => <MatchRowCompact key={m.id} match={m} />)
        )}
      </CardContent>
    </Card>
  );
}

function MatchRowCompact({ match }: { match: MatchWithTeams }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
    >
      <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
        {formatKickoffTime(match.startTime)}
      </span>
      <div className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium">{match.homeTeam.shortName ?? match.homeTeam.name}</span>
        <span className="mx-1.5 text-muted-foreground">vs</span>
        <span className="font-medium">{match.awayTeam.shortName ?? match.awayTeam.name}</span>
      </div>
      <span className="shrink-0 truncate text-xs text-muted-foreground">{match.league.name}</span>
    </Link>
  );
}

/* ── Trending news (view count) ──────────────────────────── */

export function TrendingNewsSection() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["news", "trending"],
    queryFn: () => api.get<NewsCard[]>(`/news${qs({ sort: "views", perPage: 5 })}`),
  });
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <TrendingUp aria-hidden className="h-4 w-4 text-primary" /> Tin nổi bật
          </span>
        }
      />
      <CardContent className="space-y-1">
        {isPending ? (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Chưa có tin tức." />
        ) : (
          data.map((n) => (
            <Link key={n.id} href={`/news/${n.slug}`} className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-accent/50">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                {data.indexOf(n) + 1}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {n.category.name} · {n.viewCount.toLocaleString("vi-VN")} lượt xem
                </p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
