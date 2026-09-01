import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar, Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { getPlayerBySlug, getPlayerNews, getPlayerStats } from "@/components/leagues/queries";
import { formatDate, formatRelative } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) return { title: "Không tìm thấy cầu thủ" };
  return {
    title: `${player.name} — Thống kê, thông tin`,
    description: `${player.name}${player.team ? ` (${player.team.name})` : ""} — vị trí, quốc tịch, thống kê.`,
  };
}

const POSITION_VN: Record<string, string> = {
  GK: "Thủ môn", DF: "Hậu vệ", MF: "Tiền vệ", FW: "Tiền đạo",
};

function ageOf(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug).catch(() => null);
  if (!player) notFound();

  const [stats, news] = await Promise.all([
    getPlayerStats(player.id),
    getPlayerNews(player.name),
  ]);

  const info: [string, string][] = [
    ["Quốc tịch", player.nationality ?? "—"],
    ["Sinh", player.birthDate ? `${formatDate(player.birthDate)} (${ageOf(player.birthDate)} tuổi)` : "—"],
    ["Chiều cao", player.heightCm ? `${player.heightCm} cm` : "—"],
    ["Vị trí", POSITION_VN[player.position ?? ""] ?? player.position ?? "—"],
    ["Môn", player.sport.name],
    ["Đội", player.team ? player.team.name : "—"],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar name={player.name} src={player.avatarUrl} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{player.name}</h1>
              {player.position ? <Badge variant="outline">{POSITION_VN[player.position] ?? player.position}</Badge> : null}
            </div>
            {player.team ? (
              <Link href={`/teams/${player.team.slug}`} className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                {player.team.name} →
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Thông tin" />
          <CardContent>
            <dl className="space-y-2 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Thống kê (tính từ sự kiện trận đấu)" />
          <CardContent>
            <ul className="grid grid-cols-3 gap-3 text-center text-sm">
              <li><div className="text-2xl font-bold text-primary">{stats.matches}</div><div className="text-xs text-muted-foreground">Số trận</div></li>
              <li><div className="text-2xl font-bold text-primary">{stats.goals}</div><div className="text-xs text-muted-foreground">Bàn thắng</div></li>
              <li><div className="text-2xl font-bold text-primary">{stats.assists}</div><div className="text-xs text-muted-foreground">Kiến tạo</div></li>
              <li><div className="text-2xl font-bold text-warning">{stats.yellowCards}</div><div className="text-xs text-muted-foreground">Thẻ vàng</div></li>
              <li><div className="text-2xl font-bold text-destructive">{stats.redCards}</div><div className="text-xs text-muted-foreground">Thẻ đỏ</div></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {news.length > 0 ? (
        <Card>
          <CardHeader title="Tin liên quan" />
          <CardContent>
            <ul className="space-y-2">
              {news.map((n) => (
                <li key={n.slug}>
                  <Link href={`/news/${n.slug}`} className="block rounded-lg p-2 transition-colors hover:bg-accent/50">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.publishedAt ? formatRelative(n.publishedAt) : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
