import type { Match } from '../types';

// Requests go through the Vite proxy (/api/football → api.football-data.org/v4).
// The proxy adds the X-Auth-Token header server-side, so no key is exposed in
// the browser and CORS is never an issue.
const BASE = '/api/football';

// Map football-data.org TLA codes → our internal team IDs.
// Most align with FIFA codes; list any that differ.
const TLA_TO_ID: Record<string, string> = {
  MEX:'MEX', RSA:'RSA', KOR:'KOR', CZE:'CZE',
  CAN:'CAN', BIH:'BIH', QAT:'QAT', SUI:'SUI',
  BRA:'BRA', MAR:'MAR', HAI:'HAI', HTI:'HAI', SCO:'SCO',
  USA:'USA', PAR:'PAR', AUS:'AUS', TUR:'TUR',
  GER:'GER', CUW:'CUW', CIV:'CIV', ECU:'ECU',
  NED:'NED', JPN:'JPN', SWE:'SWE', TUN:'TUN',
  BEL:'BEL', EGY:'EGY', IRN:'IRN', NZL:'NZL',
  ESP:'ESP', CPV:'CPV', KSA:'KSA', URU:'URU', URY:'URU',
  FRA:'FRA', SEN:'SEN', IRQ:'IRQ', NOR:'NOR',
  ARG:'ARG', JOR:'JOR', DZA:'DZA', ALG:'DZA', AUT:'AUT',
  POR:'POR', UZB:'UZB', COD:'COD', COL:'COL',
  ENG:'ENG', GHA:'GHA', CRO:'CRO', PAN:'PAN',
};

interface FDTeam { tla: string | null }
interface FDScore { fullTime: { home: number | null; away: number | null } }
interface FDMatch {
  id: number;
  stage: string;
  group: string | null;
  matchday: number | null;
  utcDate: string;
  status: string;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: FDScore;
}

function mapStage(stage: string, group: string | null, matchday: number): string {
  if (stage === 'GROUP_STAGE' && group) {
    const letter = group.replace('GROUP_', '');
    return `Group ${letter} – MD${matchday}`;
  }
  const map: Record<string, string> = {
    LAST_32:       'Round of 32',
    LAST_16:       'Round of 16',
    ROUND_OF_16:   'Round of 16',
    QUARTER_FINALS:'Quarter-finals',
    SEMI_FINALS:   'Semi-finals',
    THIRD_PLACE:   'Third Place',
    FINAL:         'Final',
  };
  return map[stage] ?? stage.replace(/_/g, ' ');
}

function mapStatus(apiStatus: string, hasScore: boolean): Match['status'] {
  if (apiStatus === 'FINISHED') return 'completed';
  if (hasScore || apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED') return 'predicted';
  return 'upcoming';
}

export async function fetchWorldCupMatches(): Promise<Match[] | null> {
  try {
    const res = await fetch(`${BASE}/competitions/WC/matches?season=2026`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[matchService] API responded ${res.status}`);
      return null;
    }
    const { matches }: { matches: FDMatch[] } = await res.json();

    const result: Match[] = [];
    for (const m of matches) {
      // Knockout matches have null TLAs until teams advance — skip them for now.
      if (!m.homeTeam.tla || !m.awayTeam.tla) continue;
      const teamAId = TLA_TO_ID[m.homeTeam.tla];
      const teamBId = TLA_TO_ID[m.awayTeam.tla];
      if (!teamAId || !teamBId) {
        console.warn(`[matchService] Unknown TLA: ${m.homeTeam.tla} or ${m.awayTeam.tla}`);
        continue;
      }

      const scoreA = m.score.fullTime.home;
      const scoreB = m.score.fullTime.away;
      const finished = m.status === 'FINISHED';
      const status = mapStatus(m.status, finished);

      result.push({
        id: `fd_${m.id}`,
        teamAId,
        teamBId,
        date: m.utcDate,
        stage: mapStage(m.stage, m.group, m.matchday ?? 1),
        status,
        ...(finished && scoreA !== null && scoreB !== null
          ? { actualScoreA: scoreA, actualScoreB: scoreB }
          : {}),
      });
    }

    console.info(`[matchService] Loaded ${result.length} fixtures from football-data.org`);
    return result;
  } catch (err) {
    console.warn('[matchService] Fetch failed, using static data:', err);
    return null;
  }
}

/**
 * Merge live API fixtures with the current match state.
 *
 * Rules:
 * - API is authoritative for fixture metadata (date, stage) and actual scores.
 * - Existing state is authoritative for predictions (predicted/approved scores,
 *   confidence, status when a user has already predicted the match).
 * - Knockout matches new to the API (not in existing state) are added as upcoming.
 */
export function mergeApiMatches(existing: Match[], apiMatches: Match[]): Match[] {
  // Index existing matches by team pair so we can match across ID schemes.
  const byTeams = new Map(existing.map(m => [`${m.teamAId}_${m.teamBId}`, m]));
  const mergedIds = new Set<string>();
  const merged: Match[] = [];

  for (const api of apiMatches) {
    const key = `${api.teamAId}_${api.teamBId}`;
    const local = byTeams.get(key);

    if (local) {
      mergedIds.add(local.id);
      // API actual score takes precedence if the match is finished.
      const isFinished = api.status === 'completed';
      merged.push({
        ...api,
        id: local.id,                             // keep local ID (stable for localStorage)
        status: isFinished ? 'completed' : local.status,
        predictedScoreA: local.predictedScoreA,
        predictedScoreB: local.predictedScoreB,
        approvedScoreA:  local.approvedScoreA,
        approvedScoreB:  local.approvedScoreB,
        confidence:      local.confidence,
        actualScoreA:    isFinished ? api.actualScoreA : local.actualScoreA,
        actualScoreB:    isFinished ? api.actualScoreB : local.actualScoreB,
      });
    } else {
      // Brand-new fixture (e.g. knockout match just scheduled, or correct pairing
      // replacing a stale local entry with wrong teams) — add it from API.
      merged.push(api);
    }
  }

  // When the API returned data it is the authoritative fixture list.
  // Drop any local-only matches — they may be stale, incorrect, or superseded
  // by the API's correct pairings (e.g. old FRA vs IRQ replaced by FRA vs SEN).
  // If the API returned nothing (offline / key missing), keep everything local.
  if (apiMatches.length === 0) {
    for (const m of existing) {
      if (!mergedIds.has(m.id)) merged.push(m);
    }
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}
