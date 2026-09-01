import "dotenv/config";
import { db } from "./index";
import {
  sports,
  leagues,
  seasons,
  venues,
  teams,
  players,
  teamPlayers,
  matches,
  matchEvents,
  matchStatistics,
  standings,
  news,
  newsCategories,
  newsTags,
  newsTagLinks,
  comments,
  users,
  favorites,
} from "./schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { sportsProvider } from "@/server/providers";
import type { ProviderCatalog } from "@/server/providers/types";
import { logger } from "@/server/logger";

async function upsertSports() {
  const { LEAGUES } = await import("@/server/providers/mock/catalog");
  const sportSlugs = [...new Set(LEAGUES.map((l) => l.sportSlug))];
  const rows = sportSlugs.map((slug) => {
    const meta: Record<string, { name: string; emoji: string }> = {
      football: { name: "Bóng đá", emoji: "⚽" },
      basketball: { name: "Bóng rổ", emoji: "🏀" },
      tennis: { name: "Tennis", emoji: "🎾" },
      badminton: { name: "Cầu lông", emoji: "🏸" },
      volleyball: { name: "Bóng chuyền", emoji: "🏐" },
      esports: { name: "Esports", emoji: "🎮" },
    };
    const m = meta[slug] ?? { name: slug, emoji: "🏅" };
    return { slug, name: m.name, emoji: m.emoji };
  });
  await db
    .insert(sports)
    .values(rows)
    .onConflictDoUpdate({ target: sports.slug, set: { name: sql`excluded.name` } });
  const all = await db.select().from(sports);
  return new Map(all.map((s) => [s.slug, s]));
}

async function seedCatalog(catalog: ProviderCatalog) {
  const sportsMap = await upsertSports();

  // leagues
  for (const l of catalog.leagues) {
    await db
      .insert(leagues)
      .values({
        sportId: sportsMap.get(l.sportSlug)!.id,
        slug: l.slug,
        name: l.name,
        country: l.country,
        externalId: l.externalId,
        isPopular: l.isPopular,
      })
      .onConflictDoUpdate({
        target: leagues.slug,
        set: { name: l.name, country: l.country, isPopular: l.isPopular },
      });
  }
  const leagueRows = await db.select().from(leagues);
  const leagueMap = new Map(leagueRows.map((r) => [r.externalId, r]));

  // seasons (current 2025/26)
  for (const league of leagueRows) {
    await db
      .insert(seasons)
      .values({ leagueId: league.id, name: "2025/26", isCurrent: true })
      .onConflictDoUpdate({
        target: [seasons.leagueId, seasons.name],
        set: { isCurrent: true },
      });
  }
  const seasonRows = await db.select().from(seasons);
  const seasonMap = new Map(seasonRows.map((s) => [s.leagueId, s]));

  // venues + teams
  for (const t of catalog.teams) {
    let venueId: number | null = null;
    if (t.venueName && t.venueName !== "—") {
      const v = await db
        .insert(venues)
        .values({
          name: t.venueName,
          city: t.venueCity,
          country: t.country,
          capacity: 30000 + Math.floor(Math.random() * 60000),
        })
        .onConflictDoUpdate({ target: [venues.name, venues.city], set: { name: t.venueName } })
        .returning({ id: venues.id });
      venueId = v[0]!.id;
    }
    const league = leagueMap.get(t.leagueExternalId);
    await db
      .insert(teams)
      .values({
        sportId: league?.sportId ?? sportsMap.get("football")!.id,
        leagueId: league?.id ?? null,
        slug: t.slug,
        name: t.name,
        shortName: t.shortName,
        country: t.country,
        foundedYear: t.foundedYear,
        venueId,
        externalId: t.externalId,
      })
      .onConflictDoUpdate({
        target: teams.slug,
        set: { name: t.name, shortName: t.shortName, venueId },
      });
  }
  const teamRows = await db.select().from(teams);
  const teamMap = new Map(teamRows.map((r) => [r.externalId, r]));

  // players
  for (const p of catalog.players) {
    const team = teamMap.get(p.teamExternalId);
    if (!team) continue;
    await db
      .insert(players)
      .values({
        teamId: team.id,
        sportId: team.sportId,
        slug: p.slug,
        name: p.name,
        position: p.position,
        nationality: p.nationality,
        birthDate: new Date(`${p.birthYear}-06-15`),
        heightCm: p.heightCm,
        externalId: p.externalId,
      })
      .onConflictDoUpdate({ target: players.slug, set: { name: p.name, teamId: team.id } });
    const playerRow = (
      await db.select({ id: players.id }).from(players).where(eq(players.slug, p.slug)).limit(1)
    )[0];
    if (playerRow) {
      await db
        .insert(teamPlayers)
        .values({
          teamId: team.id,
          playerId: playerRow.id,
          shirtNumber: p.shirtNumber,
          isCaptain: p.isCaptain,
        })
        .onConflictDoUpdate({
          target: [teamPlayers.teamId, teamPlayers.playerId],
          set: { shirtNumber: p.shirtNumber, isCaptain: p.isCaptain },
        });
    }
  }

  // matches (via sync pipeline — same code path as production)
  const provider = sportsProvider();
  const leagueSlugs = catalog.leagues.map((l) => l.slug);
  // reset matches to allow deterministic re-seed of live/scheduled windows
  await db.delete(matchEvents);
  await db.delete(matchStatistics);
  await db.delete(matches);
  const { syncMatches } = await import("@/server/providers/resilience");
  for (const slug of leagueSlugs) {
    const now = new Date();
    const payloads = await provider.getMatches(slug, new Date(now.getTime() - 3 * 86400_000), new Date(now.getTime() + 8 * 86400_000));
    await syncMatches(provider, payloads);
  }

  // standings
  for (const [leagueSlug, rows] of Object.entries(catalog.standings)) {
    const league = leagueMap.get(leagueSlug);
    if (!league) continue;
    const season = seasonMap.get(league.id);
    if (!season) continue;
    await db.delete(standings).where(eq(standings.seasonId, season.id));
    for (const s of rows) {
      const team = teamMap.get(s.teamExternalId);
      if (!team) continue;
      await db.insert(standings).values({
        seasonId: season.id,
        teamId: team.id,
        position: s.position,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        points: s.points,
        form: s.form,
      });
    }
  }

  return { teamMap, leagueMap, sportsMap, seasonMap };
}

const NEWS_CATEGORIES = [
  { slug: "breaking", name: "Breaking" },
  { slug: "football", name: "Football" },
  { slug: "basketball", name: "Basketball" },
  { slug: "tennis", name: "Tennis" },
  { slug: "badminton", name: "Cầu lông" },
  { slug: "volleyball", name: "Bóng chuyền" },
  { slug: "esports", name: "Esports" },
  { slug: "transfer", name: "Transfer" },
  { slug: "analysis", name: "Analysis" },
];

const TAGS = [
  "transfer", "champions-league", "premier-league", "world-cup", "nba",
  "var", "injury", "tactics", "v-league", "esports", "atp", "liverpool",
];

function article(n: number, cat: string, authorId: number | null) {
  const titles = [
    "Manchester United áp sát top 4 sau chiến thắng kịch tính",
    "Real Madrid và cuộc cách mạng chiến thuật dưới tay tân HLV",
    "NBA: Celtics lập kỷ lục 3 điểm trong trận playoff kinh điển",
    "Djokovic tuyên bố sẽ chơi đến 40 tuổi: 'Tôi vẫn còn khát'",
    "V.League: Hà Nội FC bất ngờ để tuột ngôi đầu bảng",
    "Champions League đêm nay: 5 trận đấu không thể bỏ lỡ",
    "Esports: T1 vô địch thế giới lần thứ 6 trongsequential lịch sử",
    "Trongsequential khi VAR đang giết chết bóng đá hiện đại?",
    "Alcaraz vs Sinner: cuộc đua số 1 ATP bước sang trang mới",
    "BWF World Tour: Nguyễn Tiến Minh gây sốc ở vòng 2",
    "Mercato mùa đông: 10 bản hợp đồng đáng giá nhất",
    "Bundesliga: Bayern chính thức chia tay HLV trưởng",
    "VNL: Thất bại đậm của tuyển Việt Nam trước Brazil",
    "Phân tích chiến thuật: cách Man City kiểm soát trung tâm",
    "Lịch sử Premier League: những pha bóng để đời",
    "Tennis: Świątek mất ngôi số 1 WTA vào tay Sabalenka",
  ];
  const title = titles[n % titles.length]!;
  const slug = `${cat}-article-${n}-${(n * 7919) % 9973}`;
  const paragraphs = [
    "Trận đấu diễn ra trong không khí bùng nổ với hàng chục nghìn CĐV có mặt trên sân. Hai đội nhập cuộc thận trọng nhưng càng về sau, nhịp độ càng được đẩy lên cao.",
    "Phút 68, bàn mở điểm đến từ một pha phản công chớp nhoáng. HLV trưởng sau trận chia sẻ: 'Chúng tôi đã chuẩn bị kỹ tình huống này cả tuần.'",
    " Ở đoạn cuối, đội khách dồn lên tìm bàn gỡ nhưng hàng thủ chủ nhà chơi tập trung. Ba điểm quan trọng giúp bám đuổi nhóm dẫn đầu.",
    "Với kết quả này, cuộc đua vô địch càng thêm kịch tính khi chỉ còn 5 vòng đấu. Các chuyên gia dự báo mọi thứ có thể lật ngược ở vòng cuối.",
  ];
  const content = `<p>${paragraphs.join("</p><p>")}</p><h2>Diễn biến chính</h2><p>${paragraphs[1]}</p><blockquote>Đây là trận đấu của bản lĩnh.</blockquote><p>${paragraphs[3]}</p>`;
  return {
    slug,
    title,
    subtitle: "Cập nhật thể thao trong ngày — phân tích & diễn biến mới nhất",
    excerpt: paragraphs[0]!.slice(0, 220),
    coverImageUrl: `/img/og/news-${(n % 8) + 1}.png`,
    content,
    categoryId: 0, // fill below
    authorId,
    status: "published" as const,
    isFeatured: n % 7 === 0,
    isBreaking: n === 0,
    viewCount: 500 + ((n * 37) % 20000),
    readingMinutes: 3 + (n % 6),
    publishedAt: new Date(Date.now() - (n % 14) * 3600_000 - 1800_000),
  };
}

async function seedNews(authorId: number | null) {
  for (const c of NEWS_CATEGORIES) {
    await db
      .insert(newsCategories)
      .values(c)
      .onConflictDoUpdate({ target: newsCategories.slug, set: { name: c.name } });
  }
  const cats = await db.select().from(newsCategories);
  const catMap = new Map(cats.map((c) => [c.slug, c.id]));

  for (const t of TAGS.map((name) => ({ name, slug: name }))) {
    await db
      .insert(newsTags)
      .values(t)
      .onConflictDoUpdate({ target: newsTags.slug, set: { name: t.name } });
  }
  const tagRows = await db.select().from(newsTags);

  const total = 42;
  const usedSlugs = new Set<string>();
  for (let i = 0; i < total; i++) {
    const catSlug = NEWS_CATEGORIES[i % NEWS_CATEGORIES.length]!.slug;
    const a = article(i, catSlug, authorId);
    if (usedSlugs.has(a.slug)) continue;
    usedSlugs.add(a.slug);
    const { categoryId: _c, ...rest } = a;
    await db
      .insert(news)
      .values({ ...rest, categoryId: catMap.get(catSlug)! })
      .onConflictDoUpdate({
        target: news.slug,
        set: { title: a.title, publishedAt: a.publishedAt, viewCount: a.viewCount },
      });
  }

  // tag links
  const newsRows = await db.select({ id: news.id, slug: news.slug }).from(news);
  for (const n of newsRows) {
    const tags = tagRows.filter((_, i) => (n.id + i) % 3 === 0).slice(0, 3);
    for (const t of tags) {
      await db
        .insert(newsTagLinks)
        .values({ newsId: n.id, tagId: t.id })
        .onConflictDoNothing();
    }
  }
  return newsRows;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@sport.local";
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const existing = (
    await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  )[0];
  if (existing) return existing.id;
  const row = (
    await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Admin",
        passwordHash: await hashPassword(password),
        role: "admin",
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id })
  )[0];
  return row!.id;
}

async function seedDemoUsers() {
  const demo = [
    { email: "user1@sport.local", username: "user1", displayName: "Nguyễn Văn A" },
    { email: "user2@sport.local", username: "user2", displayName: "Trần Thị B" },
  ];
  const ids: number[] = [];
  for (const u of demo) {
    const existing = (
      await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1)
    )[0];
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const row = (
      await db
        .insert(users)
        .values({
          ...u,
          passwordHash: await hashPassword("user12345"),
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id })
    )[0];
    ids.push(row!.id);
  }
  return ids;
}

async function main() {
  logger.info("seed: start");
  const provider = sportsProvider();
  const catalog = await provider.getCatalog!();
  const { teamMap } = await seedCatalog(catalog);
  const adminId = await seedAdmin();
  const userIds = await seedDemoUsers();
  const newsRows = await seedNews(adminId);

  // demo comments + favorites
  const commentSamples = [
    "Trận đấu quá hay, hiệp 2 bùng nổ!",
    "HLV thay người đúng lúc, công nhận tầm nhìn.",
    "Đội khách chơi tốt nhưng thiếu quyết đoán ở tung cuối.",
    "Bài phân tích rất chi tiết, cảm ơn tác giả.",
  ];
  for (let i = 0; i < 12; i++) {
    const newsRow = newsRows[i % newsRows.length]!;
    const userId = userIds[i % userIds.length]!;
    await db
      .insert(comments)
      .values({
        newsId: newsRow.id,
        userId,
        content: commentSamples[i % commentSamples.length]!,
        likeCount: i % 5,
      })
      .onConflictDoNothing();
  }
  const favTeams = ["team-man-united", "team-liverpool", "team-real-madrid"].flatMap((ext) =>
    teamMap.get(ext) ? [teamMap.get(ext)!] : [],
  );
  for (const uid of userIds) {
    for (const t of favTeams.slice(0, 2)) {
      await db
        .insert(favorites)
        .values({ userId: uid, favoriteType: "team", targetId: (t as { id: number }).id })
        .onConflictDoNothing();
    }
  }

  logger.info("seed: done", {
    leagues: catalog.leagues.length,
    teams: catalog.teams.length,
    players: catalog.players.length,
    matches: catalog.matches.length,
    news: newsRows.length,
    users: userIds.length + 1,
  });
  process.exit(0);
}

main().catch((err) => {
  logger.error("seed failed", { error: String(err) });
  process.exit(1);
});
