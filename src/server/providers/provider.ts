import type {
  StandingInput,
  TeamInput,
  LeagueInput,
  PlayerInput,
  ProviderCatalog,
} from "./types";
import type { MatchEventInput, MatchSyncPayload } from "./types";
export type { MatchEventInput, MatchSyncPayload };
/**
 * SportsDataProvider — the ONLY interface the sync pipeline depends on.
 * Swap mock → real (API-Football, Sportmonks...) without touching services.
 */
export interface SportsDataProvider {
  readonly name: string;

  /** Leagues for a sport (popularity flag included). */
  getLeagues(sportSlug: string): Promise<LeagueInput[]>;

  /** Teams participating in a league. */
  getTeams(leagueSlug: string): Promise<TeamInput[]>;

  /** Players of a team. */
  getPlayers(teamSlug: string): Promise<PlayerInput[]>;

  /** Current standings of a league. */
  getStandings(leagueSlug: string): Promise<StandingInput[]>;

  /** Matches in [from, to] window for a league (all statuses). */
  getMatches(leagueSlug: string, from: Date, to: Date): Promise<MatchSyncPayload[]>;

  /** Recent events of a LIVE match — polled by live engine. */
  getLiveEvents(externalMatchId: string): Promise<MatchEventInput[]>;

  /** Optional: static catalog for seeding (all leagues/teams/players/standings/matches). */
  getCatalog?(): Promise<ProviderCatalog>;
}
