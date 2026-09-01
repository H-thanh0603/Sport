import type { ProviderCatalog, TeamInput, LeagueInput, PlayerInput, StandingInput, MatchSyncPayload } from "../types";

/* Deterministic pseudo-random (seeded) so seeds are reproducible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { mulberry32 };

const rng = mulberry32(20260901);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)] as T;
const between = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export const SPORTS = [
  { slug: "football", name: "Bóng đá", emoji: "⚽" },
  { slug: "basketball", name: "Bóng rổ", emoji: "🏀" },
  { slug: "tennis", name: "Tennis", emoji: "🎾" },
  { slug: "badminton", name: "Cầu lông", emoji: "🏸" },
  { slug: "volleyball", name: "Bóng chuyền", emoji: "🏐" },
  { slug: "esports", name: "Esports", emoji: "🎮" },
] as const;

export const LEAGUES: LeagueInput[] = [
  { externalId: "premier-league", sportSlug: "football", name: "Premier League", slug: "premier-league", country: "Anh", isPopular: true },
  { externalId: "la-liga", sportSlug: "football", name: "La Liga", slug: "la-liga", country: "Tây Ban Nha", isPopular: true },
  { externalId: "champions-league", sportSlug: "football", name: "UEFA Champions League", slug: "champions-league", country: "Châu Âu", isPopular: true },
  { externalId: "serie-a", sportSlug: "football", name: "Serie A", slug: "serie-a", country: "Ý", isPopular: true },
  { externalId: "bundesliga", sportSlug: "football", name: "Bundesliga", slug: "bundesliga", country: "Đức", isPopular: true },
  { externalId: "v-league", sportSlug: "football", name: "V.League 1", slug: "v-league", country: "Việt Nam", isPopular: false },
  { externalId: "nba", sportSlug: "basketball", name: "NBA", slug: "nba", country: "Mỹ", isPopular: true },
  { externalId: "euroleague", sportSlug: "basketball", name: "EuroLeague", slug: "euroleague", country: "Châu Âu", isPopular: false },
  { externalId: "atp-tour", sportSlug: "tennis", name: "ATP Tour", slug: "atp-tour", country: "Quốc tế", isPopular: true },
  { externalId: "wta-tour", sportSlug: "tennis", name: "WTA Tour", slug: "wta-tour", country: "Quốc tế", isPopular: true },
  { externalId: "bwf-world-tour", sportSlug: "badminton", name: "BWF World Tour", slug: "bwf-world-tour", country: "Quốc tế", isPopular: false },
  { externalId: "vnl", sportSlug: "volleyball", name: "Volleyball Nations League", slug: "vnl", country: "Quốc tế", isPopular: false },
  { externalId: "lol-worlds", sportSlug: "esports", name: "LoL World Championship", slug: "lol-worlds", country: "Quốc tế", isPopular: true },
  { externalId: "csgo-major", sportSlug: "esports", name: "CS2 Major", slug: "csgo-major", country: "Quốc tế", isPopular: false },
];

const footballTeams: Array<[string, string, string, number, string, string]> = [
  ["Manchester United", "Man United", "Anh", 1878, "Old Trafford", "Manchester"],
  ["Liverpool", "Liverpool", "Anh", 1892, "Anfield", "Liverpool"],
  ["Manchester City", "Man City", "Anh", 1880, "Etihad Stadium", "Manchester"],
  ["Arsenal", "Arsenal", "Anh", 1886, "Emirates Stadium", "London"],
  ["Chelsea", "Chelsea", "Anh", 1905, "Stamford Bridge", "London"],
  ["Tottenham", "Spurs", "Anh", 1882, "Tottenham Hotspur Stadium", "London"],
  ["Newcastle", "Newcastle", "Anh", 1892, "St James' Park", "Newcastle"],
  ["Aston Villa", "Aston Villa", "Anh", 1874, "Villa Park", "Birmingham"],
  ["Real Madrid", "Real Madrid", "Tây Ban Nha", 1902, "Santiago Bernabéu", "Madrid"],
  ["Barcelona", "Barça", "Tây Ban Nha", 1899, "Camp Nou", "Barcelona"],
  ["Atlético Madrid", "Atlético", "Tây Ban Nha", 1903, "Metropolitano", "Madrid"],
  ["Inter Milan", "Inter", "Ý", 1908, "San Siro", "Milan"],
  ["AC Milan", "Milan", "Ý", 1899, "San Siro", "Milan"],
  ["Juventus", "Juve", "Ý", 1897, "Allianz Stadium", "Turin"],
  ["Napoli", "Napoli", "Ý", 1926, "Diego Armando Maradona", "Naples"],
  ["Bayern Munich", "Bayern", "Đức", 1900, "Allianz Arena", "Munich"],
  ["Borussia Dortmund", "Dortmund", "Đức", 1909, "Signal Iduna Park", "Dortmund"],
  ["RB Leipzig", "Leipzig", "Đức", 2009, "Red Bull Arena", "Leipzig"],
  ["Bayer Leverkusen", "Leverkusen", "Đức", 1904, "BayArena", "Leverkusen"],
  ["Paris Saint-Germain", "PSG", "Pháp", 1970, "Parc des Princes", "Paris"],
  ["Hà Nội FC", "Hà Nội", "Việt Nam", 2006, "Hàng Đẫy", "Hà Nội"],
  ["Bình Dương", "Bình Dương", "Việt Nam", 1976, "Gò Đậu", "Thuận An"],
  ["Sài Gòn FC", "Sài Gòn", "Việt Nam", 2011, "Thống Nhất", "TP.HCM"],
];

const leagueTeamMap: Record<string, string[]> = {
  "premier-league": ["man-united", "liverpool", "man-city", "arsenal", "chelsea", "tottenham", "newcastle", "aston-villa"],
  "la-liga": ["real-madrid", "barcelona", "atletico-madrid", "sevilla"],
  "champions-league": ["real-madrid", "bayern", "psg", "inter", "man-city", "barcelona", "napoli", "man-united"],
  "serie-a": ["inter", "milan", "juventus", "napoli", "roma", "lazio"],
  "bundesliga": ["bayern", "dortmund", "leipzig", "leverkusen", "stuttgart"],
  "v-league": ["ha-noi-fc", "binh-duong", "sai-gon-fc", "song-lam-nghe-an"],
};

// extra football teams for leagues above
footballTeams.push(
  ["Sevilla", "Sevilla", "Tây Ban Nha", 1890, "Ramón Sánchez Pizjuán", "Sevilla"],
  ["Roma", "Roma", "Ý", 1927, "Stadio Olimpico", "Rome"],
  ["Lazio", "Lazio", "Ý", 1900, "Stadio Olimpico", "Rome"],
  ["VfB Stuttgart", "Stuttgart", "Đức", 1893, "MHPArena", "Stuttgart"],
  ["Song Lam Nghệ An", "SLNA", "Việt Nam", 1975, "Vinh", "Vinh"],
);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export { slugify as slug };

export function teamsByLeague(leagueSlug: string): TeamInput[] {
  const footballLeague = ["premier-league", "la-liga", "champions-league", "serie-a", "bundesliga", "v-league"].includes(leagueSlug);
  if (footballLeague) {
    const names = leagueTeamMap[leagueSlug] ?? [];
    return names.map((slugName) => {
      const entry = footballTeams.find(([, , , , venue]) => slugify(venue.split(",")[0] ?? "") === slugName) ??
        footballTeams.find(([name]) => slugify(name) === slugName) ?? footballTeams[0]!;
      const [name, shortName, country, foundedYear, venueName, venueCity] = entry;
      return {
        externalId: `team-${slugName}`,
        leagueExternalId: leagueSlug,
        name,
        slug: slugName,
        shortName,
        country,
        foundedYear,
        venueName,
        venueCity,
      } satisfies TeamInput;
    });
  }
  if (leagueSlug === "nba") {
    const nba = [
      ["Boston Celtics", "Celtics"], ["Los Angeles Lakers", "Lakers"], ["Golden State Warriors", "Warriors"],
      ["Miami Heat", "Heat"], ["Denver Nuggets", "Nuggets"], ["Milwaukee Bucks", "Bucks"],
      ["Phoenix Suns", "Suns"], ["New York Knicks", "Knicks"], ["Chicago Bulls", "Bulls"], ["Dallas Mavericks", "Mavericks"],
      ["Brooklyn Nets", "Nets"], ["Philadelphia 76ers", "76ers"],
    ] as const;
    return nba.map(([name, shortName]) => ({
      externalId: `team-${slugify(name)}`,
      leagueExternalId: leagueSlug,
      name,
      slug: slugify(name),
      shortName,
      country: "Mỹ",
      foundedYear: between(1946, 1970),
      venueName: `${shortName} Arena`,
      venueCity: name.split(" ")[1] ?? "City",
    }));
  }
  if (leagueSlug === "euroleague") {
    const euro = [
      ["Real Madrid Baloncesto", "RMB"], ["FC Barcelona Bàsquet", "BAR"], ["Olympiacos", "OLY"],
      ["Panathinaikos", "PAO"], ["Fenerbahçe", "FBB"], ["Anadolu Efes", "EFS"],
    ] as const;
    return euro.map(([name, shortName]) => ({
      externalId: `team-${slugify(name)}`,
      leagueExternalId: leagueSlug,
      name,
      slug: slugify(name),
      shortName,
      country: "Châu Âu",
      foundedYear: between(1930, 1970),
      venueName: `${shortName} Arena`,
      venueCity: "Europe",
    }));
  }
  if (leagueSlug === "atp-tour" || leagueSlug === "wta-tour") {
    const men = [
      ["Novak Djokovic", "SRB"], ["Carlos Alcaraz", "ESP"], ["Jannik Sinner", "ITA"],
      ["Daniil Medvedev", "RUS"], ["Alexander Zverev", "GER"], ["Stefanos Tsitsipas", "GRE"],
      ["Rafael Nadal", "ESP"], ["Andy Murray", "GBR"],
    ] as const;
    const women = [
      ["Iga Świątek", "POL"], ["Aryna Sabalenka", "BLR"], ["Coco Gauff", "USA"],
      ["Elena Rybakina", "KAZ"], ["Jessica Pegula", "USA"], ["Ons Jabeur", "TUN"],
    ] as const;
    const list = leagueSlug === "atp-tour" ? men : women;
    return list.map(([name, nat]) => ({
      externalId: `player-${slugify(name)}`,
      leagueExternalId: leagueSlug,
      name,
      slug: slugify(name),
      shortName: name.split(" ")[1] ?? name,
      country: nat,
      foundedYear: between(1985, 2004),
      venueName: "—",
      venueCity: "—",
    })) as TeamInput[];
  }
  if (leagueSlug === "bwf-world-tour") {
    const bwf = [
      ["Viktor Axelsen", "DEN"], ["Anthony Sinisuka Ginting", "IDN"], ["Kunlavut Vitidsarn", "THA"],
      ["Nguyễn Tiến Minh", "VIE"], ["Lee Zii Jia", "MAS"], ["Loh Kean Yew", "SGP"],
      ["An Se-young", "KOR"], ["Akane Yamaguchi", "JPN"], ["Carolina Marín", "ESP"], ["Chen Yufei", "CHN"],
    ] as const;
    return bwf.map(([name, nat]) => ({
      externalId: `player-${slugify(name)}`,
      leagueExternalId: leagueSlug,
      name,
      slug: slugify(name),
      shortName: name.split(" ").slice(-1)[0] ?? name,
      country: nat,
      foundedYear: between(1990, 2000),
      venueName: "—",
      venueCity: "—",
    })) as TeamInput[];
  }
  if (leagueSlug === "vnl") {
    const vnl = [
      ["Brazil", "BRA"], ["Poland", "POL"], ["Italy", "ITA"], ["Japan", "JPN"],
      ["USA", "USA"], ["France", "FRA"], ["Thailand", "THA"], ["Việt Nam", "VIE"],
      ["Serbia", "SRB"], ["Türkiye", "TUR"], ["Netherlands", "NED"], ["China", "CHN"],
    ] as const;
    return vnl.map(([name, nat]) => ({
      externalId: `team-${slugify(name)}`,
      leagueExternalId: leagueSlug,
      name,
      slug: slugify(`vnl-${name}`),
      shortName: nat,
      country: nat,
      foundedYear: 1947,
      venueName: "—",
      venueCity: "—",
    }));
  }
  // esports
  const esp = [
    ["T1", "KOR"], ["Gen.G", "KOR"], ["G2 Esports", "EU"], ["Fnatic", "EU"],
    ["Team Liquid", "NA"], ["Cloud9", "NA"], ["JD Gaming", "CHN"], ["Bilibili Gaming", "CHN"],
  ] as const;
  return esp.map(([name, region]) => ({
    externalId: `team-${leagueSlug}-${slugify(name)}`,
    leagueExternalId: leagueSlug,
    name,
    slug: slugify(`${leagueSlug}-${name}`),
    shortName: name,
    country: region,
    foundedYear: between(2000, 2017),
    venueName: "—",
    venueCity: "—",
  }));
};

const firstNames = ["Luka", "Harry", "Kevin", "Marco", "Pedri", "Victor", "Bruno", "Jude", "Erling", "Kylian", "Vinícius", "Antoine", "Joshua", "Jamal", "Nikola", "Stephen", "LeBron", "Giannis", "Luka", "Jayson", "Minh", "Văn", "Quang", "Thái", "Tuấn", "Đức"];
const lastNames = ["Modrić", "Kane", "De Bruyne", "Reus", "González", "Osimhen", "Fernandes", "Bellingham", "Haaland", "Mbappé", "Júnior", "Griezmann", "Kimmich", "Musiala", "Jokić", "Curry", "James", "Antetokounmpo", "Dončić", "Tatum", "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ"];

export function playersForTeam(team: TeamInput, sportSlug: string): PlayerInput[] {
  if (sportSlug === "tennis" || sportSlug === "badminton") return [];
  const positions =
    sportSlug === "football"
      ? ["GK", "DF", "MF", "FW"]
      : sportSlug === "basketball"
        ? ["PG", "SG", "SF", "PF", "C"]
        : sportSlug === "esports"
          ? ["Top", "Jungle", "Mid", "ADC", "Support"]
          : ["Setter", "Spiker", "Blocker", "Libero"];
  const count = sportSlug === "football" ? 11 : 8;
  const used = new Set<string>();
  const players: PlayerInput[] = [];
  for (let i = 0; i < count; i++) {
    let name = "";
    do {
      name = `${pick(firstNames)} ${pick(lastNames)}`;
    } while (used.has(name));
    used.add(name);
    players.push({
      externalId: `player-${slugify(name)}-${team.slug}`,
      teamExternalId: team.externalId,
      name,
      slug: slugify(`${name}-${team.slug}`),
      position: positions[i % positions.length] ?? "MF",
      nationality: pick(["Anh", "Tây Ban Nha", "Pháp", "Đức", "Ý", "Brazil", "Argentina", "Việt Nam", "Hàn Quốc", "Mỹ", "Nhật Bản", "Serbia"]),
      birthYear: between(1990, 2005),
      heightCm: between(165, 200),
      shirtNumber: i + 1,
      isCaptain: i === 0,
    });
  }
  return players;
}

/* standings generator for team sports */
export function standingsForLeague(leagueSlug: string): StandingInput[] {
  const teams = teamsByLeague(leagueSlug);
  return teams
    .map((t) => {
      const played = between(10, 12);
      const won = between(2, Math.min(11, played));
      const drawn = between(0, played - won);
      const lost = played - won - drawn;
      const goalsFor = won * between(1, 3) + drawn * between(0, 2) + lost * between(0, 1);
      const goalsAgainst = lost * between(1, 2) + drawn * between(0, 2) + won * between(0, 1);
      const form = Array.from({ length: 5 }, () => pick(["W", "D", "L"] as const)).join("");
      return {
        teamExternalId: t.externalId,
        position: 0,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        points: won * 3 + drawn,
        form,
      } satisfies StandingInput;
    })
    .sort((a, b) => b.points - a.points || b.goalsFor - b.goalsFor === 0 ? b.points - a.points || b.goalsFor - a.goalsFor : a.goalsAgainst - b.goalsAgainst)
    .map((s, i) => ({ ...s, position: i + 1 }));
}

/* matches generator — window relative to seed time */
export function matchesForLeague(leagueSlug: string, now: Date): MatchSyncPayload[] {
  const league = LEAGUES.find((l) => l.slug === leagueSlug);
  if (!league) return [];
  const teams = teamsByLeague(leagueSlug);
  const matches: MatchSyncPayload[] = [];
  // finished: yesterday & -2d
  for (let d = 1; d <= 2; d++) {
    const day = new Date(now.getTime() - d * 86400_000);
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const home = teams[i]!;
      const away = teams[i + 1]!;
      matches.push({
        externalId: `m-${leagueSlug}-${d}d-${i}`,
        leagueExternalId: leagueSlug,
        homeTeamExternalId: home.externalId,
        awayTeamExternalId: away.externalId,
        startTime: new Date(day.getTime() + 19 * 3600_000),
        status: "finished",
        homeScore: between(0, 4),
        awayScore: between(0, 3),
        minute: 90,
      });
      if (d === 2 && i >= 4) break;
    }
    // rotate pairs for second day
    teams.push(teams.shift() as TeamInput);
  }
  // live: started 30-70 min ago
  for (let i = 0; i < 2 && i + 1 < teams.length; i += 2) {
    const home = teams[i]!;
    const away = teams[i + 1]!;
    const startMinAgo = between(30, 70);
    matches.push({
      externalId: `m-${leagueSlug}-live-${i}`,
      leagueExternalId: leagueSlug,
      homeTeamExternalId: home.externalId,
      awayTeamExternalId: away.externalId,
      startTime: new Date(now.getTime() - startMinAgo * 60_000),
      status: "live",
      homeScore: between(0, 2),
      awayScore: between(0, 2),
      minute: startMinAgo > 45 ? 45 + between(0, 25) : startMinAgo,
    });
  }
  // upcoming: today evening, tomorrow, +3d
  for (let i = 0; i + 1 < teams.length; i += 2) {
    const home = teams[i]!;
    const away = teams[i + 1]!;
    matches.push({
      externalId: `m-${leagueSlug}-up-today-${i}`,
      leagueExternalId: leagueSlug,
      homeTeamExternalId: home.externalId,
      awayTeamExternalId: away.externalId,
      startTime: new Date(now.getTime() + between(2, 5) * 3600_000),
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      minute: null,
    });
  }
  for (let d = 1; d <= 6; d++) {
    const day = new Date(now.getTime() + d * 86400_000);
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const home = teams[(i + d) % teams.length]!;
      const away = teams[(i + d + 1) % teams.length]!;
      if (home.externalId === away.externalId) continue;
      matches.push({
        externalId: `m-${leagueSlug}-up-${d}d-${i}`,
        leagueExternalId: leagueSlug,
        homeTeamExternalId: home.externalId,
        awayTeamExternalId: away.externalId,
        startTime: new Date(day.getTime() + between(14, 21) * 3600_000),
        status: d === 3 && i === 0 ? "postponed" : "scheduled",
        homeScore: null,
        awayScore: null,
        minute: null,
        postponedReason: d === 3 && i === 0 ? "Thời tiết xấu" : undefined,
      });
    }
  }
  return matches;
}

export function buildCatalog(now = new Date()): ProviderCatalog {
  const leagues = LEAGUES;
  const teams = leagues.flatMap((l) => teamsByLeague(l.slug));
  const players = teams.flatMap((t) => {
    const sport = leagues.find((l) => l.slug === t.leagueExternalId)?.sportSlug ?? "football";
    return playersForTeam(t, sport);
  });
  const standings: Record<string, StandingInput[]> = {};
  for (const l of leagues) {
    const sport = l.sportSlug;
    if (sport === "tennis" || sport === "badminton") continue;
    standings[l.slug] = standingsForLeague(l.slug);
  }
  const matches = leagues.flatMap((l) => matchesForLeague(l.slug, now));
  return { leagues, teams, players, standings, matches };
}
