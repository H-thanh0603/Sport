import type { SportsDataProvider } from "../provider";
import type {
  LeagueInput,
  MatchSyncPayload,
  PlayerInput,
  ProviderCatalog,
  StandingInput,
  TeamInput,
  MatchEventInput,
} from "../types";
import {
  LEAGUES,
  buildCatalog,
  matchesForLeague,
  playersForTeam,
  standingsForLeague,
  teamsByLeague,
} from "./catalog";

/**
 * MockSportsProvider — deterministic, self-contained.
 * Simulates external API: latency, transient failures (5%), occasional outage.
 * Tests & dev seed use it; swapping to a real provider requires zero service changes.
 */
export class MockSportsProvider implements SportsDataProvider {
  readonly name = "mock";

  private async simulatedLatency(failRate = 0.02): Promise<void> {
    const ms = 30 + Math.random() * 70;
    await new Promise((r) => setTimeout(r, ms));
    if (Math.random() < failRate) {
      const err = new Error("provider transient failure");
      (err as Error & { code?: string }).code = "EPROVIDER";
      throw err;
    }
  }

  private catalogCache: ProviderCatalog | null = null;
  private async catalog(): Promise<ProviderCatalog> {
    await this.simulatedLatency(0);
    this.catalogCache ??= buildCatalog();
    return this.catalogCache;
  }

  async getLeagues(sportSlug: string): Promise<LeagueInput[]> {
    const c = await this.catalog();
    return c.leagues.filter((l) => l.sportSlug === sportSlug);
  }

  async getTeams(leagueSlug: string): Promise<TeamInput[]> {
    await this.simulatedLatency();
    return teamsByLeague(leagueSlug);
  }

  async getPlayers(teamSlug: string): Promise<PlayerInput[]> {
    await this.simulatedLatency();
    const c = await this.catalog();
    const team = c.teams.find((t) => t.slug === teamSlug);
    if (!team) return [];
    const sport = c.leagues.find((l) => l.slug === team.leagueExternalId)?.sportSlug ?? "football";
    return playersForTeam(team, sport);
  }

  async getStandings(leagueSlug: string): Promise<StandingInput[]> {
    await this.simulatedLatency();
    return standingsForLeague(leagueSlug);
  }

  async getMatches(leagueSlug: string, from: Date, to: Date): Promise<MatchSyncPayload[]> {
    await this.simulatedLatency();
    const now = new Date();
    const all = matchesForLeague(leagueSlug, now);
    return all.filter((m) => m.startTime >= from && m.startTime <= to);
  }

  /** Live events for match — derived deterministically from match id hash. */
  async getLiveEvents(externalMatchId: string): Promise<MatchEventInput[]> {
    await this.simulatedLatency();
    let h = 0;
    for (const ch of externalMatchId) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const rnd = (i: number) => Math.abs(Math.sin(h * (i + 1)) * 10000) % 1;
    const c = await this.catalog();
    const match = c.matches.find((m) => m.externalId === externalMatchId);
    if (!match || match.status !== "live") return [];
    const teams = teamsByLeague(match.leagueExternalId);
    const events: MatchEventInput[] = [];
    for (let i = 0; i < 6; i++) {
      if (rnd(i) < 0.4) {
        const team = rnd(i + 10) < 0.5 ? teams[0] : teams[1];
        events.push({
          externalMatchId,
          minute: Math.floor(rnd(i + 20) * 85) + 1,
          type: rnd(i + 30) < 0.3 ? "yellow_card" : "goal",
          teamExternalId: team?.externalId ?? "",
          detail: rnd(i + 40) < 0.3 ? "VAR check" : undefined,
        });
      }
    }
    return events.sort((a, b) => a.minute - b.minute);
  }

  async getCatalog(): Promise<ProviderCatalog> {
    return this.catalog();
  }
}
