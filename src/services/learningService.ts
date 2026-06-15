import type { AgentPrediction, Match, PredictionRecord, AgentCallRecord } from '../types';

const RECENCY_WINDOW = 10;

// ── SERVER-BACKED PERSISTENCE ──────────────────────────────────────────────────
// Records are stored in server/data/records.json (persists across sessions/devices).
// Fallback to empty array if server is unreachable.

export async function loadRecords(): Promise<PredictionRecord[]> {
  try {
    const res = await fetch('/api/records');
    if (!res.ok) return [];
    return await res.json() as PredictionRecord[];
  } catch {
    return [];
  }
}

export async function saveRecord(record: PredictionRecord): Promise<PredictionRecord[]> {
  try {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch { /* best effort */ }
  return loadRecords();
}

// ── RECORD BUILDER ─────────────────────────────────────────────────────────────

function buildAgentRecord(pred: AgentPrediction, actualA: number, actualB: number): AgentCallRecord {
  const predWinner = pred.scoreA > pred.scoreB ? 'A' : pred.scoreA < pred.scoreB ? 'B' : 'D';
  const actualWinner = actualA > actualB ? 'A' : actualA < actualB ? 'B' : 'D';
  return {
    scoreA: pred.scoreA, scoreB: pred.scoreB, confidence: pred.confidence,
    correctOutcome: predWinner === actualWinner,
    goalError: (Math.abs(pred.scoreA - actualA) + Math.abs(pred.scoreB - actualB)) / 2,
  };
}

export function buildPredictionRecord(
  match: Match,
  agentPredictions: Record<string, AgentPrediction>,
  finalPrediction: AgentPrediction,
  actualA: number, actualB: number,
  weightsUsed: { injury: number; standings: number; sentiment: number },
  eloRatingA?: number, eloRatingB?: number,
): PredictionRecord {
  return {
    matchId: match.id, teamAId: match.teamAId, teamBId: match.teamBId,
    stage: match.stage, resolvedAt: new Date().toISOString(),
    agents: {
      injury:    buildAgentRecord(agentPredictions.injury ?? finalPrediction, actualA, actualB),
      standings: buildAgentRecord(agentPredictions.standings ?? finalPrediction, actualA, actualB),
      sentiment: buildAgentRecord(agentPredictions.sentiment ?? finalPrediction, actualA, actualB),
    },
    final: { scoreA: finalPrediction.scoreA, scoreB: finalPrediction.scoreB, confidence: finalPrediction.confidence },
    actual: { scoreA: actualA, scoreB: actualB },
    weightsUsed, eloRatingA, eloRatingB,
  };
}

// ── CUMULATIVE STATS ───────────────────────────────────────────────────────────

export interface AgentStats {
  totalMatches: number;
  correctOutcomes: number;
  outcomeAccuracy: number;
  avgGoalError: number;
  avgConfidence: number;
  recentAccuracy: number;
}

export interface LearningStats {
  injury: AgentStats;
  standings: AgentStats;
  sentiment: AgentStats;
  totalRecords: number;
}

function computeAgentStats(records: PredictionRecord[], agentKey: 'injury' | 'standings' | 'sentiment'): AgentStats {
  if (records.length === 0) {
    return { totalMatches: 0, correctOutcomes: 0, outcomeAccuracy: 0, avgGoalError: 0, avgConfidence: 0, recentAccuracy: 0 };
  }
  const all = records.map(r => r.agents[agentKey]);
  const recent = records.slice(-RECENCY_WINDOW).map(r => r.agents[agentKey]);
  const correctAll = all.filter(a => a.correctOutcome).length;
  const correctRecent = recent.filter(a => a.correctOutcome).length;
  return {
    totalMatches: all.length, correctOutcomes: correctAll,
    outcomeAccuracy: Math.round((correctAll / all.length) * 100),
    avgGoalError: parseFloat((all.reduce((s, a) => s + a.goalError, 0) / all.length).toFixed(2)),
    avgConfidence: Math.round(all.reduce((s, a) => s + a.confidence, 0) / all.length),
    recentAccuracy: Math.round((correctRecent / (recent.length || 1)) * 100),
  };
}

export function computeLearningStats(records: PredictionRecord[]): LearningStats {
  return {
    injury: computeAgentStats(records, 'injury'),
    standings: computeAgentStats(records, 'standings'),
    sentiment: computeAgentStats(records, 'sentiment'),
    totalRecords: records.length,
  };
}

// ── WEIGHT UPDATER ─────────────────────────────────────────────────────────────

export interface LearningUpdateResult {
  previousWeights: { injury: number; standings: number; sentiment: number };
  newWeights: { injury: number; standings: number; sentiment: number };
  log: string[];
}

const LEARNING_RATE = 0.08;

export function computeNewWeights(
  currentWeights: { injury: number; standings: number; sentiment: number },
  currentRecord: PredictionRecord,
  allRecords: PredictionRecord[],
): LearningUpdateResult {
  const agentKeys = ['injury', 'standings', 'sentiment'] as const;
  const previousWeights = { ...currentWeights };

  const immediatePerf: Record<string, number> = {};
  for (const key of agentKeys) {
    const agent = currentRecord.agents[key];
    const mse = Math.pow(agent.goalError, 2) * (agent.correctOutcome ? 0.5 : 1.5);
    immediatePerf[key] = 1 / (1 + mse);
  }

  const stats = computeLearningStats(allRecords);
  const recentPerf: Record<string, number> = {
    injury:    stats.injury.recentAccuracy / 100,
    standings: stats.standings.recentAccuracy / 100,
    sentiment: stats.sentiment.recentAccuracy / 100,
  };

  const blend = Math.min(0.4, 0.1 + (allRecords.length / 50) * 0.4);
  const combinedPerf: Record<string, number> = {};
  for (const key of agentKeys) {
    combinedPerf[key] = (1 - blend) * immediatePerf[key] + blend * recentPerf[key];
  }

  const avgPerf = Object.values(combinedPerf).reduce((s, v) => s + v, 0) / 3;

  const raw: Record<string, number> = {};
  for (const key of agentKeys) {
    raw[key] = Math.max(0.05, currentWeights[key] + LEARNING_RATE * (combinedPerf[key] - avgPerf));
  }

  const sum = Object.values(raw).reduce((s, v) => s + v, 0);
  const newWeights = {
    injury:    parseFloat((raw.injury / sum).toFixed(3)),
    standings: parseFloat((raw.standings / sum).toFixed(3)),
    sentiment: parseFloat((raw.sentiment / sum).toFixed(3)),
  };

  const total = newWeights.injury + newWeights.standings + newWeights.sentiment;
  if (total !== 1.0) {
    const diff = parseFloat((1.0 - total).toFixed(3));
    const top = agentKeys.slice().sort((a, b) => newWeights[b] - newWeights[a])[0];
    newWeights[top] = parseFloat((newWeights[top] + diff).toFixed(3));
  }

  const log: string[] = [];
  log.push(`Learning Agent: backpropagation complete. Actual: ${currentRecord.actual.scoreA}-${currentRecord.actual.scoreB} | Predicted: ${currentRecord.final.scoreA}-${currentRecord.final.scoreB}.`);
  log.push(`Data signal blend: ${Math.round((1 - blend) * 100)}% this match / ${Math.round(blend * 100)}% cumulative (${allRecords.length} records).`);
  const names: Record<string, string> = { injury: 'Injury Agent', standings: 'Form & ELO Agent', sentiment: 'Context Agent' };
  for (const key of agentKeys) {
    const a = currentRecord.agents[key];
    const prev = previousWeights[key as keyof typeof previousWeights];
    const next = newWeights[key as keyof typeof newWeights];
    const delta = next - prev;
    const s = stats[key as keyof typeof stats] as AgentStats;
    log.push(`${names[key]}: predicted ${a.scoreA}-${a.scoreB} (err ${a.goalError.toFixed(1)}, ${a.correctOutcome ? 'correct ✓' : 'wrong ✗'}) | career ${s.outcomeAccuracy}% (recent ${s.recentAccuracy}%) | weight ${prev.toFixed(3)} → ${next.toFixed(3)} (${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`);
  }

  return { previousWeights, newWeights, log };
}
