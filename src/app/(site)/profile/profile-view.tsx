"use client";

import Link from "next/link";
import { Heart, CalendarDays, Bell, Settings, LogOut } from "lucide-react";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, EmptyState } from "@/components/ui";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import type { MatchWithTeams } from "@/server/services/types";
import { formatMatchTime, formatScore, statusLabel, formatRelative } from "@/lib/format";
import type { SessionUser } from "@/server/auth/session";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

type FavTeam = { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null; country: string | null };
type Notif = { id: number; title: string; isRead: boolean; createdAt: Date; linkUrl: string | null };

export function ProfileView({
  user,
  favorites,
  matches,
  notifications,
  unread,
}: {
  user: SessionUser;
  favorites: FavTeam[];
  matches: MatchWithTeams[];
  notifications: Notif[];
  unread: number;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/api/v1/auth/logout");
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* header card */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-6">
          <Avatar name={user.displayName} src={user.avatarUrl} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              @{user.username} · {user.email}
            </p>
            <div className="mt-1.5 flex gap-2">
              <Badge variant="outline">{user.role}</Badge>
              {user.emailVerified ? (
                <Badge variant="success">Đã xác thực</Badge>
              ) : (
                <Badge variant="warning">Chưa xác thực email</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/profile/settings")}>
              <Settings className="h-4 w-4" aria-hidden /> Cài đặt
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()} disabled={loggingOut}>
              <LogOut className="h-4 w-4" aria-hidden /> Đăng xuất
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Your Sports — favorite teams matches */}
          <section aria-labelledby="your-sports">
            <Card>
              <CardHeader
                title={
                  <span id="your-sports" className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" aria-hidden /> Your Sports
                  </span>
                }
              />
              <CardContent>
                {matches.length === 0 ? (
                  <EmptyState
                    icon={<Heart className="h-10 w-10" />}
                    title="Chưa có trận đấu yêu thích"
                    hint="Theo dõi đội bóng để xem lịch thi đấu và kết quả ở đây."
                    action={
                      <Button size="sm" onClick={() => router.push("/standings")}>
                        Khám phá các đội
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/matches/${m.id}`}
                          className="flex items-center gap-3 px-1 py-3 transition-colors hover:bg-muted/40"
                        >
                          <span className="w-16 shrink-0 text-xs text-muted-foreground">
                            {formatMatchTime(m.startTime)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {m.homeTeam.name} <span className="text-muted-foreground">vs</span> {m.awayTeam.name}
                          </span>
                          {m.status === "scheduled" ? (
                            <Badge variant="muted">{statusLabel(m.status)}</Badge>
                          ) : (
                            <span className="font-mono text-sm font-semibold">{formatScore(m)}</span>
                          )}
                          {m.status === "live" ? (
                            <Badge variant="live">{m.minute}&apos;</Badge>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          {/* favorite teams */}
          <section aria-label="Đội bóng yêu thích">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Heart className="h-4 w-4 text-destructive" aria-hidden /> Đội yêu thích
            </h2>
            {favorites.length === 0 ? (
              <EmptyState title="Chưa theo dõi đội nào" hint="Nhấn nút Theo dõi ở trang đội bóng." />
            ) : (
              <ul className="space-y-1 rounded-lg border bg-card p-2">
                {favorites.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                    <Link href={`/teams/${t.slug}`} className="truncate text-sm font-medium hover:text-primary">
                      {t.name}
                    </Link>
                    <FavoriteButton type="team" targetId={t.id} initial size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* recent notifications */}
          <section aria-label="Thông báo gần đây">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Bell className="h-4 w-4" aria-hidden /> Thông báo
              {unread > 0 ? <Badge variant="live">{unread}</Badge> : null}
            </h2>
            {notifications.length === 0 ? (
              <EmptyState title="Chưa có thông báo" />
            ) : (
              <ul className="space-y-1 rounded-lg border bg-card p-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className={n.isRead ? "" : "font-medium"}>
                    <Link href={n.linkUrl ?? "#"} className="block truncate rounded px-2 py-1 hover:bg-muted/50">
                      {n.title}
                    </Link>
                    <span className="px-2 text-xs text-muted-foreground">{formatRelative(n.createdAt.toISOString())}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
