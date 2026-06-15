// All Gemini calls now go through the local server (/api/*).
// This keeps the API key server-side and runs agents in parallel.

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

// ── LEARNING AGENT ────────────────────────────────────────────────────────────
// Called directly from Dashboard after match resolution.
export async function geminiLearningAgent(
  teamAName: string,
  teamBName: string,
  stage: string,
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
    insight: 'Continue resolving matches to improve calibration.',
  };

  try {
    const res = await fetch('/api/agents/learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAName, teamBName, stage, actual, agentCalls, weights, careerAccuracy, totalRecords }),
    });
    if (!res.ok) return fallback;
    return await res.json() as LearningAgentResult;
  } catch {
    return fallback;
  }
}
