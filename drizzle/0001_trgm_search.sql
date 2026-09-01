-- Fuzzy search: trigram indexes for teams, players, leagues, news
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS teams_name_trgm_idx ON teams USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS players_name_trgm_idx ON players USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leagues_name_trgm_idx ON leagues USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS news_title_trgm_idx ON news USING gin (title gin_trgm_ops);
