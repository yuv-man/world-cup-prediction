import { readFileSync } from 'fs';

// Load .env.local for local dev (before any other imports that read env vars)
try {
  const envText = readFileSync('.env.local', 'utf-8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found — rely on env vars set in shell */ }

// Map VITE_GEMINI_API_KEY → GEMINI_API_KEY for backwards compat during transition
if (!process.env.GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
}

import express from 'express';
import cors from 'cors';
import {
  geminiInjuryAgent, geminiFormAgent, geminiTournamentContextAgent,
  geminiDecisionAgent, geminiLearningAgent,
} from './agents.js';
import { fetchEloData } from './elo.js';
import { loadRecords, saveRecord } from './storage.js';
import type { Team } from '../src/types/index.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '4mb' }));

const PORT = parseInt(process.env.SERVER_PORT ?? '3001', 10);

// ── FULL PREDICTION PIPELINE ──────────────────────────────────────────────────
// Runs all 3 specialist agents in parallel, then decision agent.
// ELO is fetched server-side (no browser CORS issues; cached 30 min).
app.post('/api/predict', async (req, res) => {
  try {
    const { teamA, teamB, weights, tournamentContext } = req.body as {
      teamA: Team; teamB: Team;
      weights: { injury: number; standings: number; sentiment: number };
      tournamentContext: string;
    };

    const [eloA, eloB] = await Promise.all([fetchEloData(teamA.id), fetchEloData(teamB.id)]);

    const [injuryResult, formResult, sentimentResult] = await Promise.all([
      geminiInjuryAgent(teamA, teamB, tournamentContext),
      geminiFormAgent(teamA, teamB, eloA, eloB, tournamentContext),
      geminiTournamentContextAgent(teamA, teamB, tournamentContext),
    ]);

    const decisionResult = await geminiDecisionAgent(
      teamA, teamB, injuryResult, formResult, sentimentResult, weights,
    );

    res.json({ injuryResult, formResult, sentimentResult, decisionResult, eloA, eloB });
  } catch (err) {
    console.error('[/api/predict]', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── LEARNING AGENT ────────────────────────────────────────────────────────────
app.post('/api/agents/learning', async (req, res) => {
  try {
    const { teamAName, teamBName, stage, actual, agentCalls, weights, careerAccuracy, totalRecords } = req.body;
    const result = await geminiLearningAgent(
      teamAName, teamBName, stage, actual, agentCalls, weights, careerAccuracy, totalRecords,
    );
    res.json(result);
  } catch (err) {
    console.error('[/api/agents/learning]', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── ELO PROXY ─────────────────────────────────────────────────────────────────
app.get('/api/elo/:teamId', async (req, res) => {
  try {
    const data = await fetchEloData(req.params.teamId);
    if (!data) return res.status(404).json({ error: 'ELO data not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── PREDICTION RECORDS ────────────────────────────────────────────────────────
app.get('/api/records', (_req, res) => {
  res.json(loadRecords());
});

app.post('/api/records', (req, res) => {
  try {
    const records = saveRecord(req.body);
    res.json({ ok: true, total: records.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  console.log(`[server] http://localhost:${PORT} | Gemini key: ${hasKey ? 'OK' : 'MISSING — set GEMINI_API_KEY in .env.local'}`);
});
