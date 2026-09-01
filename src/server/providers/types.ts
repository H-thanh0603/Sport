export type MatchEventInput = {
  externalMatchId: string;
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "var" | "penalty" | "other";
  teamExternalId: string;
  playerExternalId?: string;
  detail?: string;
};

export type MatchSyncPayload = {
  externalId: string;
  leagueExternalId: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  startTime: Date;
  status: "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  postponedReason?: string;
};

export type StandingInput = {
  teamExternalId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string; // "WWDLW"
};

export type LeagueInput = {
  externalId: string;
  sportSlug: string;
  name: string;
  slug: string;
  country: string;
  isPopular: boolean;
};

export type TeamInput = {
  externalId: string;
  leagueExternalId: string;
  name: string;
  slug: string;
  shortName: string;
  country: string;
  foundedYear: number;
  venueName: string;
  venueCity: string;
};

export type PlayerInput = {
  externalId: string;
  teamExternalId: string;
  name: string;
  slug: string;
  position: string;
  nationality: string;
  birthYear: number;
  heightCm: number;
  shirtNumber: number;
  isCaptain: boolean;
};

/** Full set of static data a provider can hand to the seeder. */
export type ProviderCatalog = {
  leagues: LeagueInput[];
  teams: TeamInput[];
  players: PlayerInput[];
  standings: Record<string, StandingInput[]>;
  matches: MatchSyncPayload[];
};
