CREATE TYPE "public"."comment_status" AS ENUM('visible', 'pending', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."favorite_type" AS ENUM('team', 'player', 'league');--> statement-breakpoint
CREATE TYPE "public"."match_event_type" AS ENUM('goal', 'yellow_card', 'red_card', 'substitution', 'var', 'penalty', 'period_start', 'period_end', 'injury', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('match_starting', 'match_event', 'match_result', 'system');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'banned');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" integer,
	"metadata" jsonb,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"news_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"news_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"content" varchar(2000) NOT NULL,
	"status" "comment_status" DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_len_ck" CHECK (length("comments"."content") >= 2)
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"favorite_type" "favorite_type" NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "h2h_cache" (
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "h2h_cache_home_team_id_away_team_id_pk" PRIMARY KEY("home_team_id","away_team_id")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'ok' NOT NULL,
	"duration_ms" integer,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(128) NOT NULL,
	"country" varchar(64),
	"logo_url" text,
	"external_id" varchar(96),
	"is_popular" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"minute" smallint NOT NULL,
	"type" "match_event_type" NOT NULL,
	"team_id" integer,
	"player_id" integer,
	"assist_player_id" integer,
	"detail" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_lineups" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"formation" varchar(16),
	"is_home" boolean NOT NULL,
	"coach_name" varchar(96),
	"players" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"stat_key" varchar(48) NOT NULL,
	"home_value" varchar(16) NOT NULL,
	"away_value" varchar(16) NOT NULL,
	CONSTRAINT "match_statistics_key_ck" CHECK (length("match_statistics"."stat_key") > 0)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"venue_id" integer,
	"start_time" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"minute" smallint,
	"period" smallint,
	"home_score" integer,
	"away_score" integer,
	"winner_team_id" integer,
	"external_id" varchar(96),
	"provider" varchar(32) DEFAULT 'mock' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"postponed_reason" varchar(255),
	CONSTRAINT "matches_scores_ck" CHECK ("matches"."home_score" IS NULL OR "matches"."home_score" >= 0),
	CONSTRAINT "matches_teams_ck" CHECK ("matches"."home_team_id" <> "matches"."away_team_id")
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(250) NOT NULL,
	"subtitle" varchar(300),
	"cover_image_url" text,
	"content" text NOT NULL,
	"excerpt" varchar(320) NOT NULL,
	"author_id" integer,
	"category_id" integer NOT NULL,
	"sport_id" integer,
	"league_id" integer,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"reading_minutes" smallint DEFAULT 3 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_view_ck" CHECK ("news"."view_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "news_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_tag_links" (
	"news_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(48) NOT NULL,
	"slug" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(500),
	"link_url" varchar(300),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"sport_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(128) NOT NULL,
	"position" varchar(32),
	"nationality" varchar(64),
	"birth_date" timestamp with time zone,
	"height_cm" smallint,
	"avatar_url" text,
	"external_id" varchar(96),
	CONSTRAINT "players_height_ck" CHECK ("players"."height_cm" IS NULL OR "players"."height_cm" BETWEEN 100 AND 260)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"query" varchar(128) NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"name" varchar(48) NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(64) NOT NULL,
	"emoji" varchar(8)
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"played" smallint DEFAULT 0 NOT NULL,
	"won" smallint DEFAULT 0 NOT NULL,
	"drawn" smallint DEFAULT 0 NOT NULL,
	"lost" smallint DEFAULT 0 NOT NULL,
	"goals_for" smallint DEFAULT 0 NOT NULL,
	"goals_against" smallint DEFAULT 0 NOT NULL,
	"points" smallint DEFAULT 0 NOT NULL,
	"form" varchar(10),
	CONSTRAINT "standings_played_ck" CHECK ("standings"."played" = "standings"."won" + "standings"."drawn" + "standings"."lost"),
	CONSTRAINT "standings_gd_ck" CHECK ("standings"."goals_for" >= 0 AND "standings"."goals_against" >= 0)
);
--> statement-breakpoint
CREATE TABLE "team_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"shirt_number" smallint,
	"is_captain" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_players_shirt_ck" CHECK ("team_players"."shirt_number" IS NULL OR "team_players"."shirt_number" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"league_id" integer,
	"slug" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"short_name" varchar(16),
	"country" varchar(64),
	"logo_url" text,
	"venue_id" integer,
	"founded_year" smallint,
	"external_id" varchar(96),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"username" varchar(32) NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_len" CHECK (length("users"."username") >= 3)
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"city" varchar(96),
	"country" varchar(64),
	"capacity" integer
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "h2h_cache" ADD CONSTRAINT "h2h_cache_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "h2h_cache" ADD CONSTRAINT "h2h_cache_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_assist_player_id_players_id_fk" FOREIGN KEY ("assist_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_statistics" ADD CONSTRAINT "match_statistics_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_category_id_news_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."news_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_tag_links" ADD CONSTRAINT "news_tag_links_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_tag_links" ADD CONSTRAINT "news_tag_links_tag_id_news_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."news_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_uq" ON "bookmarks" USING btree ("user_id","news_id");--> statement-breakpoint
CREATE INDEX "comments_news_created_idx" ON "comments" USING btree ("news_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_tokens_hash_uq" ON "email_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_tokens_user_idx" ON "email_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_uq" ON "favorites" USING btree ("user_id","favorite_type","target_id");--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_target_idx" ON "favorites" USING btree ("favorite_type","target_id");--> statement-breakpoint
CREATE INDEX "job_runs_name_idx" ON "job_runs" USING btree ("job_name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_slug_uq" ON "leagues" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_external_uq" ON "leagues" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "leagues_sport_idx" ON "leagues" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "match_events_match_idx" ON "match_events" USING btree ("match_id","minute");--> statement-breakpoint
CREATE INDEX "match_events_player_idx" ON "match_events" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_lineups_uq" ON "match_lineups" USING btree ("match_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_statistics_uq" ON "match_statistics" USING btree ("match_id","stat_key");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_external_uq" ON "matches" USING btree ("external_id","provider");--> statement-breakpoint
CREATE INDEX "matches_start_time_idx" ON "matches" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "matches_status_start_idx" ON "matches" USING btree ("status","start_time");--> statement-breakpoint
CREATE INDEX "matches_league_start_idx" ON "matches" USING btree ("league_id","start_time");--> statement-breakpoint
CREATE INDEX "matches_sport_start_idx" ON "matches" USING btree ("sport_id","start_time");--> statement-breakpoint
CREATE INDEX "matches_home_team_idx" ON "matches" USING btree ("home_team_id","start_time");--> statement-breakpoint
CREATE INDEX "matches_away_team_idx" ON "matches" USING btree ("away_team_id","start_time");--> statement-breakpoint
CREATE INDEX "matches_season_idx" ON "matches" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_slug_uq" ON "news" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "news_published_idx" ON "news" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "news_category_published_idx" ON "news" USING btree ("category_id","published_at");--> statement-breakpoint
CREATE INDEX "news_featured_idx" ON "news" USING btree ("is_featured","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_categories_slug_uq" ON "news_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "news_tag_links_uq" ON "news_tag_links" USING btree ("news_id","tag_id");--> statement-breakpoint
CREATE INDEX "news_tag_links_tag_idx" ON "news_tag_links" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_tags_slug_uq" ON "news_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "players_slug_uq" ON "players" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "players_external_uq" ON "players" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "players_team_idx" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "players" USING btree ("name");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "search_history_user_idx" ON "search_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_league_name_uq" ON "seasons" USING btree ("league_id","name");--> statement-breakpoint
CREATE INDEX "seasons_current_idx" ON "seasons" USING btree ("league_id","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sports_slug_uq" ON "sports" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "standings_season_team_uq" ON "standings" USING btree ("season_id","team_id");--> statement-breakpoint
CREATE INDEX "standings_season_pos_idx" ON "standings" USING btree ("season_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "team_players_uq" ON "team_players" USING btree ("team_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_uq" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_external_uq" ON "teams" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "teams_sport_idx" ON "teams" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "teams_league_idx" ON "teams" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "teams_name_idx" ON "teams" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_name_uq" ON "venues" USING btree ("name","city");