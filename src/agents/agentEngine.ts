import type { Team, Match, AgentPrediction, AgentDebateMessage, EloData } from '../types';
import { getMatchSentiment } from '../data/worldcupData';
import type { GeminiAgentResult } from '../services/geminiService';

// ── STATIC FALLBACK LOGIC (used if server is unreachable) ──────────────────────

function runInjuryAnalysisFallback(teamA: Team, teamB: Team): AgentPrediction {
  let healthA = 100, healthB = 100;
  teamA.injuries.forEach(inj => {
    const isStar = teamA.starPlayers.some(s => s.toLowerCase().includes(inj.playerName.split(' ').pop()!.toLowerCase()));
    healthA -= inj.severity === 'high' ? (isStar ? 20 : 12) : inj.severity === 'medium' ? (isStar ? 12 : 6) : (isStar ? 4 : 2);
  });
  teamB.injuries.forEach(inj => {
    const isStar = teamB.starPlayers.some(s => s.toLowerCase().includes(inj.playerName.split(' ').pop()!.toLowerCase()));
    healthB -= inj.severity === 'high' ? (isStar ? 20 : 12) : inj.severity === 'medium' ? (isStar ? 12 : 6) : (isStar ? 4 : 2);
  });
  healthA = Math.max(50, healthA); healthB = Math.max(50, healthB);
  const ratioA = healthA / healthB, ratioB = healthB / healthA;
  return {
    scoreA: Math.round(1.3 * ratioA), scoreB: Math.round(1.3 * ratioB),
    confidence: Math.round(65 + Math.min(25, Math.abs(healthA - healthB) * 1.5)),
    reasoning: [`Squad health: ${teamA.name} ${healthA}% vs ${teamB.name} ${healthB}%.`, 'Static fallback.']
  };
}

function runFormAnalysisFallback(teamA: Team, teamB: Team): AgentPrediction {
  const pts = (form: ('W' | 'D' | 'L')[]) => form.reduce((s, r) => s + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15;
  const rankScore = (r: number) => Math.max(0.1, 1 - (r - 1) / 100);
  const power = (t: Team) => (t.stats.attack * 0.4 + t.stats.midfield * 0.35 + t.stats.defense * 0.25);
  const qA = power(teamA) / 100 * 0.5 + pts(teamA.recentForm) * 0.25 + rankScore(teamA.fifaRank) * 0.25;
  const qB = power(teamB) / 100 * 0.5 + pts(teamB.recentForm) * 0.25 + rankScore(teamB.fifaRank) * 0.25;
  const diff = qA - qB;
  return {
    scoreA: Math.round(Math.max(0, 1.4 + (teamA.stats.attack - teamB.stats.defense) / 10 + diff * 2)),
    scoreB: Math.round(Math.max(0, 1.4 + (teamB.stats.attack - teamA.stats.defense) / 10 - diff * 2)),
    confidence: Math.round(70 + Math.min(25, Math.abs(diff) * 100)),
    reasoning: [`${teamA.name} FIFA #${teamA.fifaRank} vs ${teamB.name} FIFA #${teamB.fifaRank}.`, 'Form fallback.']
  };
}

function runSentimentFallback(teamA: Team, teamB: Team): AgentPrediction {
  const s = getMatchSentiment(teamA.id, teamB.id);
  let scoreA = 1, scoreB = 1;
  if (s.winA > s.winB + 15) { scoreA = s.winA > 55 ? 3 : 2; scoreB = 1; }
  else if (s.winB > s.winA + 15) { scoreA = 1; scoreB = s.winB > 55 ? 3 : 2; }
  return { scoreA, scoreB, confidence: Math.max(s.winA, s.winB), reasoning: [`Sentiment: ${teamA.name} ${s.winA}% / Draw ${s.draw}% / ${teamB.name} ${s.winB}%.`, 'Fallback.'] };
}

function toAgentPrediction(r: GeminiAgentResult): AgentPrediction {
  return { scoreA: r.scoreA, scoreB: r.scoreB, confidence: r.confidence, reasoning: r.reasoning };
}

// ── DEBATE LOG GENERATOR ───────────────────────────────────────────────────────
export function generateDebateLogs(
  teamA: Team, teamB: Team,
  predInjury: AgentPrediction, predStandings: AgentPrediction, predSentiment: AgentPrediction,
  weights: { injury: number; standings: number; sentiment: number },
  finalScoreA: number, finalScoreB: number, finalConfidence: number,
  injuryMessage?: string, formMessage?: string, sentimentMessage?: string, decisionMessage?: string,
  eloA?: EloData | null, eloB?: EloData | null,
): AgentDebateMessage[] {
  const ts = () => new Date().toLocaleTimeString();
  const logs: AgentDebateMessage[] = [];

  logs.push({ agentId: 'decision', agentName: 'Decision Agent', timestamp: ts(), type: 'system',
    message: `Initializing multi-agent system. Fixture: ${teamA.emoji} ${teamA.name} vs ${teamB.emoji} ${teamB.name}. All 3 specialist agents ran in parallel on the server...` });

  const eloAStr = eloA ? `ELO ${eloA.eloRating} (#${eloA.eloRank})` : 'ELO unavailable';
  const eloBStr = eloB ? `ELO ${eloB.eloRating} (#${eloB.eloRank})` : 'ELO unavailable';
  logs.push({ agentId: 'standings', agentName: 'Form & Standings Agent', timestamp: ts(), type: 'data',
    message: `[SERVER] Live ELO data — ${teamA.name}: ${eloAStr}, goals last 10: ${eloA?.last10GoalsFor ?? '?'} scored / ${eloA?.last10GoalsAgainst ?? '?'} conceded | ${teamB.name}: ${eloBStr}, goals last 10: ${eloB?.last10GoalsFor ?? '?'} scored / ${eloB?.last10GoalsAgainst ?? '?'} conceded` });

  logs.push({ agentId: 'injury', agentName: 'Injury Analyst', timestamp: ts(), type: 'data',
    message: injuryMessage ?? `Injury analysis complete. Prediction: ${predInjury.scoreA}-${predInjury.scoreB} (${predInjury.confidence}% confidence).` });
  logs.push({ agentId: 'standings', agentName: 'Form & Standings Agent', timestamp: ts(), type: 'data',
    message: formMessage ?? `Form & ELO analysis complete. ${teamA.name} (${teamA.recentForm.join('-')}) vs ${teamB.name} (${teamB.recentForm.join('-')}). Prediction: ${predStandings.scoreA}-${predStandings.scoreB} (${predStandings.confidence}%).` });
  logs.push({ agentId: 'sentiment', agentName: 'Tournament Context Agent', timestamp: ts(), type: 'data',
    message: sentimentMessage ?? `Context analysis complete. Prediction: ${predSentiment.scoreA}-${predSentiment.scoreB} (${predSentiment.confidence}%).` });

  const allAgree = predInjury.scoreA === predStandings.scoreA && predInjury.scoreB === predStandings.scoreB
    && predStandings.scoreA === predSentiment.scoreA && predStandings.scoreB === predSentiment.scoreB;

  if (allAgree) {
    logs.push({ agentId: 'decision', agentName: 'Decision Agent', timestamp: ts(), type: 'consensus',
      message: `Unanimous consensus: all three agents predict ${predInjury.scoreA}-${predInjury.scoreB}.` });
  } else {
    logs.push({ agentId: 'decision', agentName: 'Decision Agent', timestamp: ts(), type: 'opinion',
      message: `Discrepancy — Injury: ${predInjury.scoreA}-${predInjury.scoreB} | Form: ${predStandings.scoreA}-${predStandings.scoreB} | Context: ${predSentiment.scoreA}-${predSentiment.scoreB}. Applying weighted consensus...` });
    if (predInjury.scoreA !== predStandings.scoreA) {
      logs.push({ agentId: 'injury', agentName: 'Injury Analyst', timestamp: ts(), type: 'opinion',
        message: 'I maintain my position — the injury differential is decisive here.' });
    }
    if (Math.abs(predSentiment.scoreA - predStandings.scoreA) >= 2 || Math.abs(predSentiment.scoreB - predStandings.scoreB) >= 2) {
      logs.push({ agentId: 'sentiment', agentName: 'Tournament Context Agent', timestamp: ts(), type: 'opinion',
        message: 'Tournament pressure dynamics diverge significantly from statistical models.' });
    }
  }

  logs.push({ agentId: 'decision', agentName: 'Decision Agent', timestamp: ts(), type: 'consensus',
    message: decisionMessage ?? `Consensus reached. Weights: Injury ${Math.round(weights.injury*100)}% / Form ${Math.round(weights.standings*100)}% / Context ${Math.round(weights.sentiment*100)}%. Final: ${finalScoreA}-${finalScoreB} (${finalConfidence}% confidence). Awaiting approval.` });

  return logs;
}

// ── TOURNAMENT CONTEXT BUILDER ────────────────────────────────────────────────
function computeTournamentContext(teamA: Team, teamB: Team, allMatches: Match[], allTeams: Record<string, Team>): string {
  function getRecord(team: Team) {
    const played = allMatches.filter(m => m.status === 'completed' && (m.teamAId === team.id || m.teamBId === team.id));
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (const m of played) {
      const isA = m.teamAId === team.id;
      const scored = isA ? (m.actualScoreA ?? 0) : (m.actualScoreB ?? 0);
      const conceded = isA ? (m.actualScoreB ?? 0) : (m.actualScoreA ?? 0);
      gf += scored; ga += conceded;
      if (scored > conceded) w++; else if (scored === conceded) d++; else l++;
    }
    return { count: played.length, w, d, l, gf, ga, pts: w * 3 + d };
  }

  const recA = getRecord(teamA), recB = getRecord(teamB);
  const matchday = Math.max(recA.count + 1, recB.count + 1);
  const groupTeams = Object.values(allTeams).filter(t => t.group === teamA.group);
  const standings = groupTeams
    .map(t => ({ team: t, ...getRecord(t) }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

  const qualA = recA.count >= 2 && recA.pts >= 6;
  const elimA = recA.count >= 2 && recA.pts === 0;
  const qualB = recB.count >= 2 && recB.pts >= 6;
  const elimB = recB.count >= 2 && recB.pts === 0;

  let ctx = `TOURNAMENT CONTEXT — ${teamA.group}, Matchday ${matchday}\n\nCURRENT GROUP STANDINGS:\n`;
  standings.forEach((s, i) => { ctx += `  ${i+1}. ${s.team.name}: ${s.pts}pts (${s.w}W-${s.d}D-${s.l}L, GF:${s.gf} GA:${s.ga})\n`; });
  ctx += `\n${teamA.name} — MD${recA.count+1}, ${recA.pts}pts${qualA?' [QUALIFIED]':elimA?' [ELIMINATED]':''}`;
  ctx += `\n${teamB.name} — MD${recB.count+1}, ${recB.pts}pts${qualB?' [QUALIFIED]':elimB?' [ELIMINATED]':''}`;
  return ctx;
}

// ── MAIN ASYNC PREDICTION RUNNER ──────────────────────────────────────────────
// Sends all data to the local server which runs agents in parallel using Gemini.
export async function runMatchPrediction(
  teamA: Team, teamB: Team,
  weights: { injury: number; standings: number; sentiment: number },
  onAgentProgress?: (agentId: string, status: 'thinking' | 'done') => void,
  allMatches: Match[] = [], allTeams: Record<string, Team> = {},
) {
  const tournamentContext = computeTournamentContext(teamA, teamB, allMatches, allTeams);

  // Mark all specialist agents as thinking (they run in parallel on server)
  onAgentProgress?.('standings', 'thinking');
  onAgentProgress?.('injury', 'thinking');
  onAgentProgress?.('sentiment', 'thinking');
  onAgentProgress?.('decision', 'thinking');

  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamA, teamB, weights, tournamentContext }),
  });

  if (!res.ok) {
    throw new Error(`Server error ${res.status}: ${await res.text()}`);
  }

  const { injuryResult, formResult, sentimentResult, decisionResult, eloA, eloB } = await res.json() as {
    injuryResult: GeminiAgentResult; formResult: GeminiAgentResult;
    sentimentResult: GeminiAgentResult; decisionResult: GeminiAgentResult;
    eloA: EloData | null; eloB: EloData | null;
  };

  onAgentProgress?.('standings', 'done');
  onAgentProgress?.('injury', 'done');
  onAgentProgress?.('sentiment', 'done');
  onAgentProgress?.('decision', 'done');

  const injuryPred     = toAgentPrediction(injuryResult);
  const standingsPred  = toAgentPrediction(formResult);
  const sentimentPred  = toAgentPrediction(sentimentResult);

  const finalPrediction: AgentPrediction = {
    scoreA: decisionResult.scoreA, scoreB: decisionResult.scoreB,
    confidence: decisionResult.confidence, reasoning: decisionResult.reasoning,
  };

  const debateLogs = generateDebateLogs(
    teamA, teamB, injuryPred, standingsPred, sentimentPred, weights,
    finalPrediction.scoreA, finalPrediction.scoreB, finalPrediction.confidence,
    injuryResult.message, formResult.message, sentimentResult.message, decisionResult.message,
    eloA, eloB,
  );

  return {
    agentPredictions: { injury: injuryPred, standings: standingsPred, sentiment: sentimentPred },
    finalPrediction,
    debateLogs,
  };
}

// ── LEARNING FEEDBACK LOOP ────────────────────────────────────────────────────
export interface LearningUpdateResult {
  previousWeights: { injury: number; standings: number; sentiment: number };
  newWeights: { injury: number; standings: number; sentiment: number };
  errors: Record<string, number>;
  log: string[];
}

export function runLearningLoop(
  match: Match,
  agentPredictions: Record<string, AgentPrediction>,
  currentWeights: { injury: number; standings: number; sentiment: number },
  learningRate = 0.08,
): LearningUpdateResult {
  const actualA = match.actualScoreA ?? 0;
  const actualB = match.actualScoreB ?? 0;
  const previousWeights = { ...currentWeights };
  const errors: Record<string, number> = {};
  const performances: Record<string, number> = {};
  let totalPerformance = 0;

  Object.entries(agentPredictions).forEach(([agentId, pred]) => {
    let mse = (Math.pow(pred.scoreA - actualA, 2) + Math.pow(pred.scoreB - actualB, 2)) / 2;
    const predWinner = pred.scoreA > pred.scoreB ? 'A' : pred.scoreA < pred.scoreB ? 'B' : 'D';
    const actualWinner = actualA > actualB ? 'A' : actualA < actualB ? 'B' : 'D';
    mse *= predWinner === actualWinner ? 0.5 : 1.5;
    errors[agentId] = mse;
    const perf = 1 / (1 + mse);
    performances[agentId] = perf;
    totalPerformance += perf;
  });

  const avgPerf = totalPerformance / 3;
  const updates: Record<string, number> = {};
  Object.keys(currentWeights).forEach(id => { updates[id] = learningRate * (performances[id] - avgPerf); });

  const updatedWeights: Record<string, number> = {};
  let rawSum = 0;
  Object.entries(currentWeights).forEach(([id, w]) => {
    const v = Math.max(0.05, w + updates[id]);
    updatedWeights[id] = v; rawSum += v;
  });
  Object.keys(updatedWeights).forEach(id => { updatedWeights[id] = parseFloat((updatedWeights[id] / rawSum).toFixed(3)); });

  let finalSum = Object.values(updatedWeights).reduce((s, w) => s + w, 0);
  if (finalSum !== 1.0) {
    const diff = parseFloat((1.0 - finalSum).toFixed(3));
    const top = Object.entries(updatedWeights).sort((a, b) => b[1] - a[1])[0][0];
    updatedWeights[top] = parseFloat((updatedWeights[top] + diff).toFixed(3));
  }

  const newWeights = { injury: updatedWeights.injury, standings: updatedWeights.standings, sentiment: updatedWeights.sentiment };

  const log: string[] = [];
  log.push(`Learning Agent: backpropagation complete. Actual: ${actualA}-${actualB}.`);
  Object.entries(agentPredictions).forEach(([id, pred]) => {
    const names: Record<string, string> = { injury: 'Injury Specialist', standings: 'Form & ELO Specialist', sentiment: 'Context Specialist' };
    const correct = (pred.scoreA > pred.scoreB && actualA > actualB) || (pred.scoreA < pred.scoreB && actualA < actualB) || (pred.scoreA === pred.scoreB && actualA === actualB);
    log.push(`${names[id] ?? id}: predicted ${pred.scoreA}-${pred.scoreB} (Error: ${errors[id].toFixed(2)}, Outcome: ${correct ? 'CORRECT ✓' : 'INCORRECT ✗'}).`);
  });

  return { previousWeights, newWeights, errors, log };
}

// Sync fallback for resolve modal (no server call needed)
export function runMatchPredictionSync(
  teamA: Team, teamB: Team,
  weights: { injury: number; standings: number; sentiment: number },
) {
  const injuryPred    = runInjuryAnalysisFallback(teamA, teamB);
  const standingsPred = runFormAnalysisFallback(teamA, teamB);
  const sentimentPred = runSentimentFallback(teamA, teamB);
  const finalScoreA = Math.round(injuryPred.scoreA * weights.injury + standingsPred.scoreA * weights.standings + sentimentPred.scoreA * weights.sentiment);
  const finalScoreB = Math.round(injuryPred.scoreB * weights.injury + standingsPred.scoreB * weights.standings + sentimentPred.scoreB * weights.sentiment);
  const finalConfidence = Math.round(injuryPred.confidence * weights.injury + standingsPred.confidence * weights.standings + sentimentPred.confidence * weights.sentiment);
  const debateLogs = generateDebateLogs(teamA, teamB, injuryPred, standingsPred, sentimentPred, weights, finalScoreA, finalScoreB, finalConfidence);
  return {
    agentPredictions: { injury: injuryPred, standings: standingsPred, sentiment: sentimentPred },
    finalPrediction: { scoreA: finalScoreA, scoreB: finalScoreB, confidence: finalConfidence, reasoning: ['Static fallback prediction.'] },
    debateLogs,
  };
}
