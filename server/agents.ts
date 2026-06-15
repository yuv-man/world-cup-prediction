import { GoogleGenAI } from '@google/genai';
import type { Team, EloData } from '../src/types/index.js';

export interface GeminiAgentResult {
  scoreA: number;
  scoreB: number;
  confidence: number;
  reasoning: string[];
  message: string;
}

export interface LearningAgentResult {
  analysis: string[];
  insight: string;
}

function getAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenAI({ apiKey: key });
}

// Only real, verified models — fake models cascade-fail silently so we strip them
const MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
] as const;

async function callGemini(prompt: string, useSearch = false): Promise<string | null> {
  const ai = getAI();
  for (const model of MODEL_CASCADE) {
    try {
      const config = useSearch ? { tools: [{ googleSearch: {} }] } : undefined;
      const res = await ai.models.generateContent({ model, contents: prompt, config });
      if (model !== 'gemini-2.5-flash') console.info(`[agents] fallback model: ${model}`);
      return res.text ?? '';
    } catch (err) {
      // On any error (404 model missing, 429 quota, 503 unavailable) → try next model.
      // Only retry without search if that's what failed.
      if (useSearch && err instanceof Error && !err.message.includes('429') && !err.message.includes('RESOURCE_EXHAUSTED')) {
        try {
          const res = await ai.models.generateContent({ model, contents: prompt });
          return res.text ?? '';
        } catch { /* fall through to next model */ }
      }
      console.warn(`[agents:${model}] ${err instanceof Error ? err.message.slice(0, 80) : err}`);
    }
  }
  console.warn('[agents] All models failed, returning null (will use static fallback).');
  return null;
}

function parseJson<T>(text: string, fallback: T): T {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  try { return JSON.parse(match ? match[1] : text) as T; } catch { return fallback; }
}

function fmtEloBlock(name: string, elo: EloData | null): string {
  if (!elo) return `  (ELO data unavailable for ${name})`;
  const form = elo.recentMatches.map(m => `${m.result} ${m.goalsFor}-${m.goalsAgainst} vs ${m.opponent} [${m.matchType}]`).join(', ');
  return [
    `  ELO Rating: ${elo.eloRating} (Rank #${elo.eloRank})`,
    `  Last match: ${elo.lastMatch?.date ?? 'unknown'} — ${elo.lastMatch?.result ?? '?'} vs ${elo.lastMatch?.opponent ?? '?'} (${elo.lastMatch?.type ?? '?'})`,
    `  Goals (last 10): ${elo.last10GoalsFor} scored / ${elo.last10GoalsAgainst} conceded`,
    `  Recent 5: ${form || 'unavailable'}`,
  ].join('\n');
}

// ── INJURY AGENT ──────────────────────────────────────────────────────────────
export async function geminiInjuryAgent(
  teamA: Team, teamB: Team, tournamentContext = '',
): Promise<GeminiAgentResult> {
  const fallback: GeminiAgentResult = {
    scoreA: 1, scoreB: 1, confidence: 65,
    reasoning: [`${teamA.name} injury report analysed.`, `${teamB.name} injury report analysed.`, 'Standard squad health assumed.'],
    message: 'Injury analysis complete (fallback).'
  };

  const prompt = `You are a professional football injury analyst for the 2026 FIFA World Cup.

USE GOOGLE SEARCH to find current injury news for:
- "${teamA.name} injury news World Cup 2026"
- "${teamB.name} squad update June 2026"

TEAM A — ${teamA.name} (FIFA #${teamA.fifaRank}):
Stars: ${teamA.starPlayers.join(', ')}
Known injuries (verify via search): ${teamA.injuries.length === 0 ? 'Full squad available' : teamA.injuries.map(i => `${i.playerName} (${i.severity}): ${i.description}`).join('; ')}

TEAM B — ${teamB.name} (FIFA #${teamB.fifaRank}):
Stars: ${teamB.starPlayers.join(', ')}
Known injuries (verify via search): ${teamB.injuries.length === 0 ? 'Full squad available' : teamB.injuries.map(i => `${i.playerName} (${i.severity}): ${i.description}`).join('; ')}

${tournamentContext}

Respond ONLY with valid JSON:
{"scoreA":<0-5>,"scoreB":<0-5>,"confidence":<55-95>,"reasoning":["<bullet>","<bullet>","<bullet>"],"message":"<one sentence on key injury finding>"}`;

  const text = await callGemini(prompt, true);
  if (!text) return fallback;
  return parseJson<GeminiAgentResult>(text, fallback);
}

// ── FORM & ELO AGENT ──────────────────────────────────────────────────────────
export async function geminiFormAgent(
  teamA: Team, teamB: Team,
  eloA: EloData | null = null, eloB: EloData | null = null,
  tournamentContext = '',
): Promise<GeminiAgentResult> {
  const fallback: GeminiAgentResult = {
    scoreA: 1, scoreB: 1, confidence: 70,
    reasoning: [
      `${teamA.name} ELO: ${eloA?.eloRating ?? 'N/A'}, form: ${teamA.recentForm.join('-')}`,
      `${teamB.name} ELO: ${eloB?.eloRating ?? 'N/A'}, form: ${teamB.recentForm.join('-')}`,
      'ELO and form analysis complete.',
    ],
    message: 'Form & ELO analysis complete (fallback).'
  };

  const eloWinProbA = eloA && eloB
    ? 1 / (1 + Math.pow(10, (eloB.eloRating - eloA.eloRating) / 400))
    : null;
  const eloFormula = eloWinProbA !== null && eloA && eloB
    ? `ELO Win Probability: P(${teamA.name} wins) = 1/(1+10^((${eloB.eloRating}-${eloA.eloRating})/400)) = ${(eloWinProbA * 100).toFixed(1)}%. Use as primary anchor: >65% → likely win, <35% → likely defeat.`
    : 'ELO win probability unavailable.';

  const prompt = `You are a football statistics and form analyst for the 2026 FIFA World Cup.

USE GOOGLE SEARCH for:
- "${teamA.name} 2026 World Cup last match result"
- "${teamB.name} 2026 World Cup recent form"

TEAM A — ${teamA.name} (FIFA #${teamA.fifaRank}):
Last 5: ${teamA.recentForm.join(', ')} | Attack ${teamA.stats.attack} Mid ${teamA.stats.midfield} Def ${teamA.stats.defense}
Live ELO:
${fmtEloBlock(teamA.name, eloA)}

TEAM B — ${teamB.name} (FIFA #${teamB.fifaRank}):
Last 5: ${teamB.recentForm.join(', ')} | Attack ${teamB.stats.attack} Mid ${teamB.stats.midfield} Def ${teamB.stats.defense}
Live ELO:
${fmtEloBlock(teamB.name, eloB)}

${eloFormula}
${tournamentContext}

Let ELO dictate the winner; form and stakes dictate the margin.

Respond ONLY with valid JSON:
{"scoreA":<0-5>,"scoreB":<0-5>,"confidence":<55-95>,"reasoning":["<ELO probability>","<form/goals>","<matchday/stakes>"],"message":"<one sentence on ELO + context>"}`;

  const text = await callGemini(prompt, true);
  if (!text) return fallback;
  return parseJson<GeminiAgentResult>(text, fallback);
}

// ── TOURNAMENT CONTEXT AGENT ──────────────────────────────────────────────────
export async function geminiTournamentContextAgent(
  teamA: Team, teamB: Team, tournamentContext: string,
): Promise<GeminiAgentResult> {
  const fallback: GeminiAgentResult = {
    scoreA: 1, scoreB: 1, confidence: 60,
    reasoning: ['Tournament pressure assessed.', 'Group stage dynamics factored.', 'Qualification stakes evaluated.'],
    message: 'Tournament context analysis complete (fallback).'
  };

  const prompt = `You are a tournament context analyst for the 2026 FIFA World Cup.
Predict a scoreline based purely on group stage pressure and qualification stakes — not raw stats.

${tournamentContext}

MATCH: ${teamA.name} vs ${teamB.name}

- Matchday 1: cautious, low-scoring
- Matchday 2: stakes clarify, more attacking
- Matchday 3: do-or-die — needing teams attack, qualified teams rotate
- Eliminated teams: attack recklessly or collapse
- Qualified teams: rest key players → tighter game

Respond ONLY with valid JSON:
{"scoreA":<0-5>,"scoreB":<0-5>,"confidence":<50-90>,"reasoning":["<matchday>","<group positions>","<qualification stakes>"],"message":"<one sentence on how stakes shape this match>"}`;

  const text = await callGemini(prompt);
  if (!text) return fallback;
  return parseJson<GeminiAgentResult>(text, fallback);
}

// ── DECISION AGENT ────────────────────────────────────────────────────────────
export async function geminiDecisionAgent(
  teamA: Team, teamB: Team,
  injury: GeminiAgentResult, form: GeminiAgentResult, sentiment: GeminiAgentResult,
  weights: { injury: number; standings: number; sentiment: number },
): Promise<GeminiAgentResult> {
  const rawA = injury.scoreA * weights.injury + form.scoreA * weights.standings + sentiment.scoreA * weights.sentiment;
  const rawB = injury.scoreB * weights.injury + form.scoreB * weights.standings + sentiment.scoreB * weights.sentiment;
  const rawConf = injury.confidence * weights.injury + form.confidence * weights.standings + sentiment.confidence * weights.sentiment;
  const wA = Math.round(rawA), wB = Math.round(rawB), wConf = Math.round(rawConf);

  const fallback: GeminiAgentResult = {
    scoreA: wA, scoreB: wB, confidence: wConf,
    reasoning: [
      `Weighted formula: ${rawA.toFixed(2)} → ${wA} / ${rawB.toFixed(2)} → ${wB}`,
      `Injury: ${injury.scoreA}-${injury.scoreB} | Form: ${form.scoreA}-${form.scoreB} | Context: ${sentiment.scoreA}-${sentiment.scoreB}`,
      'Consensus locked.',
    ],
    message: `Final: ${teamA.name} ${wA}-${wB} ${teamB.name} (fallback).`
  };

  const prompt = `You are the decision coordinator in a multi-agent football prediction system.

MATCH: ${teamA.name} vs ${teamB.name}

INJURY SPECIALIST (${Math.round(weights.injury*100)}%): ${injury.scoreA}-${injury.scoreB} (${injury.confidence}%) — ${injury.reasoning.join(' | ')}
FORM & ELO SPECIALIST (${Math.round(weights.standings*100)}%): ${form.scoreA}-${form.scoreB} (${form.confidence}%) — ${form.reasoning.join(' | ')}
CONTEXT SPECIALIST (${Math.round(weights.sentiment*100)}%): ${sentiment.scoreA}-${sentiment.scoreB} (${sentiment.confidence}%) — ${sentiment.reasoning.join(' | ')}

WEIGHTED FORMULA (mandatory):
scoreA = ${injury.scoreA}×${weights.injury.toFixed(2)} + ${form.scoreA}×${weights.standings.toFixed(2)} + ${sentiment.scoreA}×${weights.sentiment.toFixed(2)} = ${rawA.toFixed(2)} → ${wA}
scoreB = ${injury.scoreB}×${weights.injury.toFixed(2)} + ${form.scoreB}×${weights.standings.toFixed(2)} + ${sentiment.scoreB}×${weights.sentiment.toFixed(2)} = ${rawB.toFixed(2)} → ${wB}

Your scoreA MUST be ${Math.max(0,wA-1)}, ${wA}, or ${Math.min(5,wA+1)}. Only deviate ±1 if all three agents agree.

Respond ONLY with valid JSON:
{"scoreA":<must be within ±1 of ${wA}>,"scoreB":<must be within ±1 of ${wB}>,"confidence":<55-95>,"reasoning":["<formula result>","<deviation explanation or confirmation>","<final verdict>"],"message":"<one sentence final verdict>"}`;

  const text = await callGemini(prompt);
  if (!text) return fallback;
  return parseJson<GeminiAgentResult>(text, fallback);
}

// ── LEARNING AGENT ────────────────────────────────────────────────────────────
export async function geminiLearningAgent(
  teamAName: string, teamBName: string, stage: string,
  actual: { scoreA: number; scoreB: number },
  agentCalls: {
    injury:    { scoreA: number; scoreB: number; confidence: number; correct: boolean; error: number };
    standings: { scoreA: number; scoreB: number; confidence: number; correct: boolean; error: number };
    sentiment: { scoreA: number; scoreB: number; confidence: number; correct: boolean; error: number };
  },
  weights: {
    previous: { injury: number; standings: number; sentiment: number };
    updated:  { injury: number; standings: number; sentiment: number };
  },
  careerAccuracy: { injury: number; standings: number; sentiment: number },
  totalRecords: number,
): Promise<LearningAgentResult> {
  const fmt = (n: number) => (n * 100).toFixed(0) + '%';
  const d = (k: keyof typeof weights.previous) => ((weights.updated[k] - weights.previous[k]) * 100).toFixed(1);

  const fallback: LearningAgentResult = {
    analysis: [
      `Result: ${teamAName} ${actual.scoreA}–${actual.scoreB} ${teamBName}.`,
      `Best agent: ${[
        { name: 'Form/ELO', err: agentCalls.standings.error },
        { name: 'Injury', err: agentCalls.injury.error },
        { name: 'Context', err: agentCalls.sentiment.error },
      ].sort((a, b) => a.err - b.err)[0].name}`,
      `${totalRecords} resolved matches. Weights recalibrated.`,
      `Career: Injury ${careerAccuracy.injury}% | Form ${careerAccuracy.standings}% | Context ${careerAccuracy.sentiment}%`,
    ],
    insight: 'Continue resolving matches to improve weight calibration.',
  };

  const prompt = `You are the Learning Agent in a multi-agent football prediction system.
A World Cup 2026 match has resolved. Analyse prediction performance.

MATCH: ${teamAName} vs ${teamBName} (${stage})
ACTUAL: ${actual.scoreA}-${actual.scoreB}

AGENT PERFORMANCE:
- Injury: predicted ${agentCalls.injury.scoreA}-${agentCalls.injury.scoreB} (${agentCalls.injury.confidence}% conf) → error ${agentCalls.injury.error.toFixed(1)}, ${agentCalls.injury.correct ? 'CORRECT ✓' : 'WRONG ✗'}
- Form/ELO: predicted ${agentCalls.standings.scoreA}-${agentCalls.standings.scoreB} (${agentCalls.standings.confidence}% conf) → error ${agentCalls.standings.error.toFixed(1)}, ${agentCalls.standings.correct ? 'CORRECT ✓' : 'WRONG ✗'}
- Context: predicted ${agentCalls.sentiment.scoreA}-${agentCalls.sentiment.scoreB} (${agentCalls.sentiment.confidence}% conf) → error ${agentCalls.sentiment.error.toFixed(1)}, ${agentCalls.sentiment.correct ? 'CORRECT ✓' : 'WRONG ✗'}

WEIGHT RECALIBRATION:
- Injury:   ${fmt(weights.previous.injury)} → ${fmt(weights.updated.injury)} (${d('injury')}pp)
- Form/ELO: ${fmt(weights.previous.standings)} → ${fmt(weights.updated.standings)} (${d('standings')}pp)
- Context:  ${fmt(weights.previous.sentiment)} → ${fmt(weights.updated.sentiment)} (${d('sentiment')}pp)

CAREER ACCURACY (${totalRecords} matches): Injury ${careerAccuracy.injury}% | Form ${careerAccuracy.standings}% | Context ${careerAccuracy.sentiment}%

Respond ONLY with valid JSON:
{
  "analysis":["<best agent this match and why>","<pattern observed>","<what weight shift means>","<blind spot revealed>"],
  "insight":"<one actionable sentence for future predictions>"
}`;

  const text = await callGemini(prompt);
  if (!text) return fallback;
  return parseJson<LearningAgentResult>(text, fallback);
}
