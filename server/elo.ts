import type { EloData, EloMatch } from '../src/types/index.js';

const TEAM_URL_MAP: Record<string, string> = {
  MEX:'Mexico', RSA:'South_Africa', KOR:'South_Korea', CZE:'Czechia',
  CAN:'Canada', BIH:'Bosnia_and_Herzegovina', QAT:'Qatar', SUI:'Switzerland',
  BRA:'Brazil', MAR:'Morocco', HAI:'Haiti', SCO:'Scotland',
  USA:'United_States', PAR:'Paraguay', AUS:'Australia', TUR:'Turkey',
  GER:'Germany', CUW:'Curacao', CIV:'Ivory_Coast', ECU:'Ecuador',
  NED:'Netherlands', JPN:'Japan', SWE:'Sweden', TUN:'Tunisia',
  BEL:'Belgium', EGY:'Egypt', IRN:'Iran', NZL:'New_Zealand',
  ESP:'Spain', CPV:'Cape_Verde', KSA:'Saudi_Arabia', URU:'Uruguay',
  FRA:'France', SEN:'Senegal', IRQ:'Iraq', NOR:'Norway',
  ARG:'Argentina', DZA:'Algeria', AUT:'Austria', JOR:'Jordan',
  POR:'Portugal', COD:'DR_Congo', UZB:'Uzbekistan', COL:'Colombia',
  ENG:'England', CRO:'Croatia', GHA:'Ghana', PAN:'Panama',
};

function parseTsv(text: string): EloData | null {
  const rows: Array<{
    date: string; home: string; away: string;
    homeGoals: number; awayGoals: number; matchType: string;
    homeElo: number; awayElo: number;
    homeEloChange: number; awayEloChange: number;
    homeRank: number; awayRank: number;
  }> = [];

  for (const line of text.split('\n')) {
    const c = line.trim().split('\t');
    if (c.length < 14) continue;
    const year = parseInt(c[0], 10);
    if (isNaN(year)) continue;
    rows.push({
      date: `${c[0]}-${c[1].padStart(2,'0')}-${c[2].padStart(2,'0')}`,
      home: c[3]?.trim(), away: c[4]?.trim(),
      homeGoals: parseInt(c[5], 10), awayGoals: parseInt(c[6], 10),
      matchType: c[7]?.trim(),
      homeElo: parseInt(c[10], 10) || 0, awayElo: parseInt(c[11], 10) || 0,
      homeEloChange: parseFloat(c[12]) || 0, awayEloChange: parseFloat(c[13]) || 0,
      homeRank: parseInt(c[14], 10) || 0, awayRank: parseInt(c[15], 10) || 0,
    });
  }
  if (rows.length === 0) return null;

  const recent20 = rows.slice(-20);
  const codeCounts: Record<string, number> = {};
  for (const r of recent20) {
    codeCounts[r.home] = (codeCounts[r.home] || 0) + 1;
    codeCounts[r.away] = (codeCounts[r.away] || 0) + 1;
  }
  const ourCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const recent10 = rows.slice(-10);
  const recentMatches: EloMatch[] = recent10.map(r => {
    const isHome = r.home === ourCode;
    const goalsFor = isHome ? r.homeGoals : r.awayGoals;
    const goalsAgainst = isHome ? r.awayGoals : r.homeGoals;
    const eloChange = isHome ? r.homeEloChange : r.awayEloChange;
    const eloBase = isHome ? r.homeElo : r.awayElo;
    return {
      date: r.date, opponent: isHome ? r.away : r.home,
      goalsFor, goalsAgainst,
      result: (goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D') as 'W' | 'D' | 'L',
      matchType: r.matchType,
      eloAfter: Math.round(eloBase + eloChange), eloChange,
    };
  });

  const last = recentMatches[recentMatches.length - 1];
  const lastRow = rows[rows.length - 1];
  const isHomeInLast = lastRow.home === ourCode;

  return {
    eloRating: last?.eloAfter ?? 0,
    eloRank: isHomeInLast ? lastRow.homeRank : lastRow.awayRank,
    last10GoalsFor: recentMatches.reduce((s, m) => s + m.goalsFor, 0),
    last10GoalsAgainst: recentMatches.reduce((s, m) => s + m.goalsAgainst, 0),
    lastMatch: last ? { date: last.date, opponent: last.opponent, result: `${last.goalsFor}-${last.goalsAgainst}`, type: last.matchType } : null,
    recentMatches: recentMatches.slice(-5),
  };
}

// Cache ELO data in memory (refreshed every 30 min)
const cache = new Map<string, { data: EloData; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function fetchEloData(teamId: string): Promise<EloData | null> {
  const cached = cache.get(teamId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const urlName = TEAM_URL_MAP[teamId];
  if (!urlName) return null;

  try {
    const res = await fetch(`https://eloratings.net/${urlName}.tsv`);
    if (!res.ok) return null;
    const text = await res.text();
    const data = parseTsv(text);
    if (data) cache.set(teamId, { data, ts: Date.now() });
    return data;
  } catch {
    return null;
  }
}
