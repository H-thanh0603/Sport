import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ───────────────────────── enums ───────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "banned"]);
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
]);
export const matchEventTypeEnum = pgEnum("match_event_type", [
  "goal",
  "yellow_card",
  "red_card",
  "substitution",
  "var",
  "penalty",
  "period_start",
  "period_end",
  "injury",
  "other",
]);
export const favoriteTypeEnum = pgEnum("favorite_type", ["team", "player", "league"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "match_starting",
  "match_event",
  "match_result",
  "system",
]);
export const newsStatusEnum = pgEnum("news_status", ["draft", "published", "archived"]);
export const commentStatusEnum = pgEnum("comment_status", [
  "visible",
  "pending",
  "hidden",
  "deleted",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);

/* ───────────────────────── auth / users ───────────────────────── */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    avatarUrl: text("avatar_url"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_username_uq").on(t.username),
    check("users_username_len", sql`length(${t.username}) >= 3`),
    index("users_role_idx").on(t.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(), // verify_email | reset_password
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("email_tokens_hash_uq").on(t.tokenHash),
    index("email_tokens_user_idx").on(t.userId, t.purpose),
  ],
);

/* ───────────────────────── sports domain ───────────────────────── */

export const sports = pgTable(
  "sports",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 48 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    emoji: varchar("emoji", { length: 8 }),
  },
  (t) => [uniqueIndex("sports_slug_uq").on(t.slug)],
);

export const leagues = pgTable(
  "leagues",
  {
    id: serial("id").primaryKey(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    country: varchar("country", { length: 64 }),
    logoUrl: text("logo_url"),
    externalId: varchar("external_id", { length: 96 }),
    isPopular: boolean("is_popular").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("leagues_slug_uq").on(t.slug),
    uniqueIndex("leagues_external_uq").on(t.externalId),
    index("leagues_sport_idx").on(t.sportId),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 48 }).notNull(), // "2025/26"
    isCurrent: boolean("is_current").notNull().default(false),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("seasons_league_name_uq").on(t.leagueId, t.name),
    index("seasons_current_idx").on(t.leagueId, t.isCurrent),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    city: varchar("city", { length: 96 }),
    country: varchar("country", { length: 64 }),
    capacity: integer("capacity"),
  },
  (t) => [uniqueIndex("venues_name_uq").on(t.name, t.city)],
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    shortName: varchar("short_name", { length: 16 }),
    country: varchar("country", { length: 64 }),
    logoUrl: text("logo_url"),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    foundedYear: smallint("founded_year"),
    externalId: varchar("external_id", { length: 96 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("teams_slug_uq").on(t.slug),
    uniqueIndex("teams_external_uq").on(t.externalId),
    index("teams_sport_idx").on(t.sportId),
    index("teams_league_idx").on(t.leagueId),
    index("teams_name_idx").on(t.name),
  ],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    position: varchar("position", { length: 32 }),
    nationality: varchar("nationality", { length: 64 }),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    heightCm: smallint("height_cm"),
    avatarUrl: text("avatar_url"),
    externalId: varchar("external_id", { length: 96 }),
  },
  (t) => [
    uniqueIndex("players_slug_uq").on(t.slug),
    uniqueIndex("players_external_uq").on(t.externalId),
    index("players_team_idx").on(t.teamId),
    index("players_name_idx").on(t.name),
    check("players_height_ck", sql`${t.heightCm} IS NULL OR ${t.heightCm} BETWEEN 100 AND 260`),
  ],
);

export const teamPlayers = pgTable(
  "team_players",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    shirtNumber: smallint("shirt_number"),
    isCaptain: boolean("is_captain").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("team_players_uq").on(t.teamId, t.playerId),
    check(
      "team_players_shirt_ck",
      sql`${t.shirtNumber} IS NULL OR ${t.shirtNumber} BETWEEN 1 AND 99`,
    ),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    minute: smallint("minute"),
    period: smallint("period"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    winnerTeamId: integer("winner_team_id").references(() => teams.id, { onDelete: "set null" }),
    externalId: varchar("external_id", { length: 96 }),
    provider: varchar("provider", { length: 32 }).notNull().default("mock"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    postponedReason: varchar("postponed_reason", { length: 255 }),
  },
  (t) => [
    uniqueIndex("matches_external_uq").on(t.externalId, t.provider),
    check("matches_scores_ck", sql`${t.homeScore} IS NULL OR ${t.homeScore} >= 0`),
    check("matches_teams_ck", sql`${t.homeTeamId} <> ${t.awayTeamId}`),
    index("matches_start_time_idx").on(t.startTime),
    index("matches_status_start_idx").on(t.status, t.startTime),
    index("matches_league_start_idx").on(t.leagueId, t.startTime),
    index("matches_sport_start_idx").on(t.sportId, t.startTime),
    index("matches_home_team_idx").on(t.homeTeamId, t.startTime),
    index("matches_away_team_idx").on(t.awayTeamId, t.startTime),
    index("matches_season_idx").on(t.seasonId),
  ],
);

export const matchEvents = pgTable(
  "match_events",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    minute: smallint("minute").notNull(),
    type: matchEventTypeEnum("type").notNull(),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    assistPlayerId: integer("assist_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    detail: varchar("detail", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("match_events_match_idx").on(t.matchId, t.minute),
    index("match_events_player_idx").on(t.playerId),
  ],
);

export const matchStatistics = pgTable(
  "match_statistics",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    statKey: varchar("stat_key", { length: 48 }).notNull(),
    homeValue: varchar("home_value", { length: 16 }).notNull(),
    awayValue: varchar("away_value", { length: 16 }).notNull(),
  },
  (t) => [
    uniqueIndex("match_statistics_uq").on(t.matchId, t.statKey),
    check("match_statistics_key_ck", sql`length(${t.statKey}) > 0`),
  ],
);

export const matchLineups = pgTable(
  "match_lineups",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    formation: varchar("formation", { length: 16 }),
    isHome: boolean("is_home").notNull(),
    coachName: varchar("coach_name", { length: 96 }),
    players: jsonb("players").notNull(), // [{playerId, name, shirtNumber, position, x, y}]
  },
  (t) => [uniqueIndex("match_lineups_uq").on(t.matchId, t.teamId)],
);

export const standings = pgTable(
  "standings",
  {
    id: serial("id").primaryKey(),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    played: smallint("played").notNull().default(0),
    won: smallint("won").notNull().default(0),
    drawn: smallint("drawn").notNull().default(0),
    lost: smallint("lost").notNull().default(0),
    goalsFor: smallint("goals_for").notNull().default(0),
    goalsAgainst: smallint("goals_against").notNull().default(0),
    points: smallint("points").notNull().default(0),
    form: varchar("form", { length: 10 }),
  },
  (t) => [
    uniqueIndex("standings_season_team_uq").on(t.seasonId, t.teamId),
    index("standings_season_pos_idx").on(t.seasonId, t.position),
    check(
      "standings_played_ck",
      sql`${t.played} = ${t.won} + ${t.drawn} + ${t.lost}`,
    ),
    check("standings_gd_ck", sql`${t.goalsFor} >= 0 AND ${t.goalsAgainst} >= 0`),
  ],
);

export const h2hCache = pgTable(
  "h2h_cache",
  {
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb("payload").notNull(),
  },
  (t) => [primaryKey({ columns: [t.homeTeamId, t.awayTeamId] })],
);

/* ───────────────────────── news ───────────────────────── */

export const newsCategories = pgTable(
  "news_categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
  },
  (t) => [uniqueIndex("news_categories_slug_uq").on(t.slug)],
);

export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 250 }).notNull(),
    subtitle: varchar("subtitle", { length: 300 }),
    coverImageUrl: text("cover_image_url"),
    content: text("content").notNull(),
    excerpt: varchar("excerpt", { length: 320 }).notNull(),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => newsCategories.id, { onDelete: "cascade" }),
    sportId: integer("sport_id").references(() => sports.id, { onDelete: "set null" }),
    leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
    status: newsStatusEnum("status").notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isBreaking: boolean("is_breaking").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    readingMinutes: smallint("reading_minutes").notNull().default(3),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("news_slug_uq").on(t.slug),
    index("news_published_idx").on(t.status, t.publishedAt),
    index("news_category_published_idx").on(t.categoryId, t.publishedAt),
    index("news_featured_idx").on(t.isFeatured, t.publishedAt),
    check("news_view_ck", sql`${t.viewCount} >= 0`),
  ],
);

export const newsTags = pgTable(
  "news_tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 48 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
  },
  (t) => [uniqueIndex("news_tags_slug_uq").on(t.slug)],
);

export const newsTagLinks = pgTable(
  "news_tag_links",
  {
    newsId: integer("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => newsTags.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("news_tag_links_uq").on(t.newsId, t.tagId),
    index("news_tag_links_tag_idx").on(t.tagId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    newsId: integer("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    content: varchar("content", { length: 2000 }).notNull(),
    status: commentStatusEnum("status").notNull().default("visible"),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comments_news_created_idx").on(t.newsId, t.createdAt),
    index("comments_user_idx").on(t.userId),
    index("comments_status_idx").on(t.status),
    check("comments_len_ck", sql`length(${t.content}) >= 2`),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newsId: integer("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bookmarks_uq").on(t.userId, t.newsId)],
);

/* ───────────────────────── engagement ───────────────────────── */

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    favoriteType: favoriteTypeEnum("favorite_type").notNull(),
    targetId: integer("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("favorites_uq").on(t.userId, t.favoriteType, t.targetId),
    index("favorites_user_idx").on(t.userId),
    index("favorites_target_idx").on(t.favoriteType, t.targetId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 500 }),
    linkUrl: varchar("link_url", { length: 300 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userId, t.isRead, t.createdAt),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    query: varchar("query", { length: 128 }).notNull(),
    resultCount: integer("result_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("search_history_user_idx").on(t.userId, t.createdAt)],
);

/* ───────────────────────── moderation / ops ───────────────────────── */

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 16 }).notNull(), // comment | news
    targetId: integer("target_id").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedBy: integer("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.createdAt),
    index("reports_target_idx").on(t.targetType, t.targetId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata"),
    ip: varchar("ip", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_user_idx").on(t.userId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: serial("id").primaryKey(),
    jobName: varchar("job_name", { length: 64 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("ok"), // ok | error
    durationMs: integer("duration_ms"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("job_runs_name_idx").on(t.jobName, t.createdAt)],
);
