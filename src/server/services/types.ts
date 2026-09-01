/** Shared service-layer types — contract from WORKPLAN.md §5.1. */

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled";

export type MatchEvent = {
  id: number;
  minute: number;
  type:
    | "goal"
    | "yellow_card"
    | "red_card"
    | "substitution"
    | "var"
    | "penalty"
    | "period_start"
    | "period_end"
    | "injury"
    | "other";
  teamId: number | null;
  teamName: string | null;
  teamSlug: string | null;
  detail: string | null;
};

export type MatchWithTeams = {
  id: number;
  startTime: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  league: { slug: string; name: string };
  sport: { slug: string; name: string; emoji: string | null };
  homeTeam: { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null };
  awayTeam: { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null };
  postponedReason?: string | null;
};

export type MatchListFilters = {
  sport?: string;
  league?: string;
  date?: string; // YYYY-MM-DD (UTC day)
  status?: MatchStatus | MatchStatus[];
  teamId?: number;
  page?: number;
  perPage?: number;
  window?: "today" | "tomorrow" | "week";
};

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
};

export type Paginated<T> = { items: T[]; meta: PaginationMeta };

export type MatchLineupPlayer = {
  playerId: number;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  x: number;
  y: number;
};

export type MatchLineup = {
  teamId: number;
  teamSlug: string;
  teamName: string;
  formation: string | null;
  coachName: string | null;
  isHome: boolean;
  players: MatchLineupPlayer[];
};

export type MatchStatistic = { key: string; label: string; home: string; away: string };

export type H2HSummary = { total: number; homeWin: number; awayWin: number; draw: number; goals: number };

export type CommentaryLine = { minute: number | null; text: string };

export type MatchDetail = MatchWithTeams & {
  venue: { name: string; city: string | null } | null;
  events: MatchEvent[];
  statistics: MatchStatistic[];
  lineups: MatchLineup[];
  h2h: { summary: H2HSummary; recent: MatchWithTeams[] };
  commentary: CommentaryLine[];
};

export type StandingRow = {
  position: number;
  previousPosition: number | null;
  team: { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: string | null;
};

export type TeamSummary = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  country: string | null;
};

export type TeamDetail = TeamSummary & {
  foundedYear: number | null;
  venue: { name: string; city: string | null; capacity: number | null } | null;
  league: { slug: string; name: string } | null;
  sport: { slug: string; name: string; emoji: string | null };
};

export type PlayerDetail = {
  id: number;
  slug: string;
  name: string;
  position: string | null;
  nationality: string | null;
  birthDate: string | null;
  heightCm: number | null;
  avatarUrl: string | null;
  team: { id: number; slug: string; name: string } | null;
  sport: { slug: string; name: string };
};

export type PlayerStats = {
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type LeagueSummary = {
  id: number;
  slug: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  isPopular: boolean;
  sport: { slug: string; name: string; emoji: string | null };
};

export type NewsCard = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  category: { slug: string; name: string };
  authorName: string | null;
  publishedAt: string | null;
  viewCount: number;
  readingMinutes: number;
  isBreaking: boolean;
  isFeatured: boolean;
};

export type NewsDetail = NewsCard & {
  subtitle: string | null;
  content: string;
  tags: { slug: string; name: string }[];
};

export type SearchResults = {
  teams: TeamSummary[];
  players: PlayerDetail[];
  leagues: LeagueSummary[];
  news: NewsCard[];
  total: number;
};
