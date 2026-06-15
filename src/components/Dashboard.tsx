import React, { useState, useEffect } from 'react';
import type { Match, Team, AgentState, AgentType, MatchPredictionState, WeightHistoryPoint, PerformanceStats, AgentDebateMessage } from '../types';
import { teams as initialTeams, initialMatches, initialAgents } from '../data/worldcupData';
import { runMatchPrediction, runMatchPredictionSync } from '../agents/agentEngine';
import { buildPredictionRecord, saveRecord, computeNewWeights, computeLearningStats } from '../services/learningService';
import { fetchWorldCupMatches, mergeApiMatches } from '../services/matchService';
import { geminiLearningAgent } from '../services/geminiService';
import { AgentWeights } from './AgentWeights';
import { AgentTerminal } from './AgentTerminal';
import { PredictionApproval } from './PredictionApproval';
import { ResolveMatchModal } from './ResolveMatchModal';
import { StatsOverview } from './StatsOverview';
import { PredictionsPage } from './PredictionsPage';
import { MobilePredictionSheet } from './MobilePredictionSheet';

const ALL_GROUPS = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function getFlagUrl(teamId: string): string {
  const isoMap: Record<string, string> = {
    MEX:'mx', RSA:'za', KOR:'kr', CZE:'cz', CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
    BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct', USA:'us', PAR:'py', AUS:'au', TUR:'tr',
    GER:'de', CUW:'cw', CIV:'ci', ECU:'ec', NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
    BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz', ESP:'es', CPV:'cv', KSA:'sa', URU:'uy',
    FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no', ARG:'ar', DZA:'dz', AUT:'at', JOR:'jo',
    POR:'pt', COD:'cd', UZB:'uz', COL:'co', ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
  };
  const code = isoMap[teamId];
  return code ? `https://flagcdn.com/w80/${code}.png` : '';
}

export const Dashboard: React.FC = () => {
  const [teams, setTeams] = useState<Record<string, Team>>(initialTeams);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryPoint[]>([
    { timestamp: '00:00:00', matchId: 'init', matchName: 'Base Grid', injuryWeight: 0.30, standingsWeight: 0.40, sentimentWeight: 0.30 }
  ]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalPredicted: 0, totalCompleted: 0, correctOutcomes: 0, exactScores: 0, avgError: 0, accuracyRate: 0
  });
  const [activePredictingId, setActivePredictingId] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<MatchPredictionState | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<AgentDebateMessage[]>([]);
  const [resolveMatchId, setResolveMatchId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('All');
  const [activeNav, setActiveNav] = useState<'dashboard' | 'predictions' | 'leaderboard'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [manualMatchId, setManualMatchId] = useState<string | null>(null);
  const [manualScoreA, setManualScoreA] = useState(0);
  const [manualScoreB, setManualScoreB] = useState(0);
  const [mobileSheetMatchId, setMobileSheetMatchId] = useState<string | null>(null);
  const [mobileSheetAIMode, setMobileSheetAIMode] = useState(false);

  useEffect(() => {
    // ── Version gate: bump when static fixture data changes to clear stale cache ──
    const FIXTURE_VERSION = '3';
    if (localStorage.getItem('wc_predictor_fixture_version') !== FIXTURE_VERSION) {
      localStorage.removeItem('wc_predictor_matches');
      localStorage.setItem('wc_predictor_fixture_version', FIXTURE_VERSION);
    }

    // ── 1. Restore non-fixture state from localStorage immediately ────────────
    const savedStats   = localStorage.getItem('wc_predictor_stats');
    const savedWeights = localStorage.getItem('wc_predictor_weights');
    const savedMatches = localStorage.getItem('wc_predictor_matches');
    const savedHistory = localStorage.getItem('wc_predictor_history');
    const savedTeams   = localStorage.getItem('wc_predictor_teams');

    // Fixtures always start from correct static data — never trust a stale cache
    const baseMatches: Match[] = initialMatches;
    // Re-apply any prediction overlays saved from the current session
    const predictionOverlay: Match[] = savedMatches ? JSON.parse(savedMatches) : [];
    const overlayById = new Map(predictionOverlay.map(m => [m.id, m]));
    const localMatches: Match[] = baseMatches.map(m => {
      const saved = overlayById.get(m.id);
      if (!saved) return m;
      // Keep fixture metadata from static data; restore prediction state from localStorage
      return {
        ...m,
        status:          saved.status ?? m.status,
        predictedScoreA: saved.predictedScoreA,
        predictedScoreB: saved.predictedScoreB,
        approvedScoreA:  saved.approvedScoreA,
        approvedScoreB:  saved.approvedScoreB,
        confidence:      saved.confidence,
        actualScoreA:    saved.actualScoreA,
        actualScoreB:    saved.actualScoreB,
      };
    });

    if (savedStats)   setStats(JSON.parse(savedStats));
    setMatches(localMatches);
    if (savedHistory) setWeightHistory(JSON.parse(savedHistory));
    if (savedTeams)   setTeams(JSON.parse(savedTeams));
    if (savedWeights) {
      const pw = JSON.parse(savedWeights) as Record<AgentType, number>;
      setAgents(prev => prev.map(a => ({ ...a, weight: pw[a.id] ?? a.weight })));
    }

    // ── 2. Fetch live fixtures from football-data.org and merge ──────────────
    // Adds knockout matches as they're scheduled; keeps actual scores live.
    fetchWorldCupMatches().then(apiMatches => {
      if (!apiMatches || apiMatches.length === 0) return;
      setMatches(current => mergeApiMatches(current, apiMatches));
    });
  }, []);

  // Seed selectedDate to the first upcoming match date >= today
  useEffect(() => {
    if (selectedDate) return;
    const today = new Date().toISOString().slice(0, 10);
    const dates = [...new Set(matches.filter(m => m.status === 'upcoming').map(m => m.date.slice(0, 10)))].sort();
    const first = dates.find(d => d >= today) ?? dates[0] ?? today;
    setSelectedDate(first);
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveState = (um: Match[], us: PerformanceStats, uh: WeightHistoryPoint[], ua: AgentState[]) => {
    localStorage.setItem('wc_predictor_matches', JSON.stringify(um));
    localStorage.setItem('wc_predictor_stats', JSON.stringify(us));
    localStorage.setItem('wc_predictor_history', JSON.stringify(uh));
    const wm = ua.reduce((acc, a) => { acc[a.id] = a.weight; return acc; }, {} as Record<string, number>);
    localStorage.setItem('wc_predictor_weights', JSON.stringify(wm));
  };

  const getWeightsObj = (agentList: AgentState[]) => ({
    injury: agentList.find(a => a.id === 'injury')?.weight ?? 0.3,
    standings: agentList.find(a => a.id === 'standings')?.weight ?? 0.4,
    sentiment: agentList.find(a => a.id === 'sentiment')?.weight ?? 0.3,
  });

  const handleWeightChange = (changedId: AgentType, newWeight: number) => {
    setAgents(prevAgents => {
      const target = prevAgents.find(a => a.id === changedId);
      if (!target) return prevAgents;
      const delta = newWeight - target.weight;
      const others = prevAgents.filter(a => a.id !== changedId);
      const otherSum = others.reduce((s, a) => s + a.weight, 0);
      let updated = prevAgents.map(a => {
        if (a.id === changedId) return { ...a, weight: parseFloat(newWeight.toFixed(3)) };
        const share = otherSum > 0 ? a.weight / otherSum : 0.5;
        return { ...a, weight: parseFloat(Math.max(0.05, Math.min(0.90, a.weight - delta * share)).toFixed(3)) };
      });
      let total = updated.reduce((s, a) => s + a.weight, 0);
      if (total !== 1.0) {
        const disc = parseFloat((1.0 - total).toFixed(3));
        const top = updated.filter(a => a.id !== changedId).sort((a, b) => b.weight - a.weight)[0];
        updated = updated.map(a => a.id === top.id ? { ...a, weight: parseFloat((a.weight + disc).toFixed(3)) } : a);
      }
      saveState(matches, stats, weightHistory, updated);
      return updated;
    });
  };

  const handleResetWeights = () => {
    setAgents(prev => {
      const reset = prev.map(a => ({ ...a, weight: a.id === 'standings' ? 0.4 : 0.3 }));
      saveState(matches, stats, weightHistory, reset);
      return reset;
    });
  };

  const handleTriggerPrediction = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const teamA = teams[match.teamAId];
    const teamB = teams[match.teamBId];
    if (!teamA || !teamB) return;

    setActivePredictingId(matchId);
    setSelectedPrediction(null);
    setTerminalLogs([]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'scraping' as const })));
    setTerminalLogs([{
      agentId: 'decision', agentName: 'Decision Agent',
      message: `Launching Gemini-powered agents for ${teamA.emoji} ${teamA.name} vs ${teamB.emoji} ${teamB.name}...`,
      timestamp: new Date().toLocaleTimeString(), type: 'system'
    }]);

    try {
      const currentWeights = getWeightsObj(agents);
      const result = await runMatchPrediction(teamA, teamB, currentWeights,
        (agentId, status) => setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, status: status === 'thinking' ? 'analyzing' : 'done' } : a
        )),
        matches,
        teams,
      );

      const logs = result.debateLogs;
      let step = 0;
      const interval = setInterval(() => {
        if (step < logs.length) {
          if (logs[step]) setTerminalLogs(prev => [...prev, logs[step]]);
          step++;
        } else {
          clearInterval(interval);
          setAgents(prev => prev.map(a => ({ ...a, status: 'done' as const })));
          const updatedMatches = matches.map(m => m.id === matchId ? {
            ...m, status: 'predicted' as const,
            predictedScoreA: result.finalPrediction.scoreA,
            predictedScoreB: result.finalPrediction.scoreB,
            confidence: result.finalPrediction.confidence
          } : m);
          setMatches(updatedMatches);
          setSelectedPrediction({ matchId, agentPredictions: result.agentPredictions, finalPrediction: result.finalPrediction, debateLogs: logs });
          setActivePredictingId(null);
          const newStats = { ...stats, totalPredicted: stats.totalPredicted + 1 };
          setStats(newStats);
          saveState(updatedMatches, newStats, weightHistory, agents);
        }
      }, 600);
    } catch (err) {
      setActivePredictingId(null);
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' as const })));
      setTerminalLogs(prev => [...prev, {
        agentId: 'decision', agentName: 'System',
        message: `Prediction failed. Check VITE_GEMINI_API_KEY. Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toLocaleTimeString(), type: 'system'
      }]);
    }
  };

  const handleManualPredict = (matchId: string) => {
    const updatedMatches = matches.map(m => m.id === matchId ? {
      ...m,
      status: 'approved' as const,
      predictedScoreA: manualScoreA,
      predictedScoreB: manualScoreB,
      approvedScoreA: manualScoreA,
      approvedScoreB: manualScoreB,
      confidence: 100,
    } : m);
    setMatches(updatedMatches);
    setManualMatchId(null);
    const newStats = { ...stats, totalPredicted: stats.totalPredicted + 1 };
    setStats(newStats);
    saveState(updatedMatches, newStats, weightHistory, agents);
    setTerminalLogs(prev => [...prev, {
      agentId: 'decision' as AgentType, agentName: 'System',
      message: `Manual prediction locked: ${teams[matches.find(m => m.id === matchId)!.teamAId]?.name} ${manualScoreA} – ${manualScoreB} ${teams[matches.find(m => m.id === matchId)!.teamBId]?.name}. Awaiting final score to resolve.`,
      timestamp: new Date().toLocaleTimeString(), type: 'system',
    }]);
  };

  const handleResetPrediction = (matchId: string) => {
    const updatedMatches = matches.map(m => m.id === matchId ? {
      ...m,
      status: 'upcoming' as const,
      predictedScoreA: undefined,
      predictedScoreB: undefined,
      approvedScoreA: undefined,
      approvedScoreB: undefined,
      confidence: undefined,
    } : m);
    setMatches(updatedMatches);
    if (selectedPrediction?.matchId === matchId) setSelectedPrediction(null);
    saveState(updatedMatches, stats, weightHistory, agents);
  };

  const handleResetAllPredictions = () => {
    const updatedMatches = matches.map(m =>
      (m.status === 'predicted' || m.status === 'approved')
        ? { ...m, status: 'upcoming' as const, predictedScoreA: undefined, predictedScoreB: undefined, approvedScoreA: undefined, approvedScoreB: undefined, confidence: undefined }
        : m
    );
    setMatches(updatedMatches);
    setSelectedPrediction(null);
    saveState(updatedMatches, stats, weightHistory, agents);
  };

  const handleApprovePrediction = (matchId: string, approvedA: number, approvedB: number) => {
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, status: 'approved' as const, approvedScoreA: approvedA, approvedScoreB: approvedB } : m);
    setMatches(updatedMatches);
    setSelectedPrediction(null);
    saveState(updatedMatches, stats, weightHistory, agents);
  };

  const handleReevaluatePrediction = async (matchId: string, hint: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const teamA = JSON.parse(JSON.stringify(teams[match.teamAId])) as Team;
    const teamB = JSON.parse(JSON.stringify(teams[match.teamBId])) as Team;
    const parsed = hint.toLowerCase();
    [...teamA.injuries, ...teamB.injuries].forEach(inj => {
      const last = inj.playerName.split(' ').pop() || '';
      if (parsed.includes(last.toLowerCase()) && (parsed.includes('fit') || parsed.includes('play'))) {
        teamA.injuries = teamA.injuries.filter(i => !i.playerName.includes(last));
        teamB.injuries = teamB.injuries.filter(i => !i.playerName.includes(last));
      }
    });
    [teamA, teamB].forEach(team => {
      if (parsed.includes(team.name.toLowerCase()) && (parsed.includes('boost') || parsed.includes('strong'))) {
        team.stats.attack = Math.min(99, team.stats.attack + 6);
        team.stats.midfield = Math.min(99, team.stats.midfield + 6);
      }
    });
    await handleTriggerPrediction(matchId);
  };

  const handleResolveMatch = async (matchId: string, actualA: number, actualB: number) => {
    const resolvedMatch = matches.find(m => m.id === matchId);
    if (!resolvedMatch) return;
    const teamA = teams[resolvedMatch.teamAId];
    const teamB = teams[resolvedMatch.teamBId];
    const currentWeights = getWeightsObj(agents);

    const agentPreds = selectedPrediction?.matchId === matchId
      ? selectedPrediction.agentPredictions
      : runMatchPredictionSync(teamA, teamB, currentWeights).agentPredictions;
    const finalPred = selectedPrediction?.matchId === matchId
      ? selectedPrediction.finalPrediction
      : { scoreA: resolvedMatch.predictedScoreA ?? 0, scoreB: resolvedMatch.predictedScoreB ?? 0, confidence: resolvedMatch.confidence ?? 0, reasoning: [] };

    const record = buildPredictionRecord(resolvedMatch, agentPreds, finalPred, actualA, actualB, currentWeights);
    const allRecords = await saveRecord(record);
    const { newWeights, log } = computeNewWeights(currentWeights, record, allRecords);
    const careerStats = computeLearningStats(allRecords);

    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, status: 'completed' as const, actualScoreA: actualA, actualScoreB: actualB } : m
    );
    const updatedAgents = agents.map(a => ({
      ...a,
      weight: (['injury', 'standings', 'sentiment'] as AgentType[]).includes(a.id) ? newWeights[a.id as keyof typeof newWeights] : a.weight,
      status: a.id === 'learning' ? 'analyzing' as const : 'idle' as const,
    }));
    const updatedHistory = [...weightHistory, {
      timestamp: new Date().toLocaleTimeString(), matchId,
      matchName: `${teamA.emoji} vs ${teamB.emoji}`,
      injuryWeight: newWeights.injury, standingsWeight: newWeights.standings, sentimentWeight: newWeights.sentiment,
    }];

    const predA = resolvedMatch.approvedScoreA ?? resolvedMatch.predictedScoreA ?? 0;
    const predB = resolvedMatch.approvedScoreB ?? resolvedMatch.predictedScoreB ?? 0;
    const isCorrect = ((predA - predB > 0) === (actualA - actualB > 0) && (predA - predB < 0) === (actualA - actualB < 0)) || (predA === predB && actualA === actualB);
    const isExact = predA === actualA && predB === actualB;
    const completed = stats.totalCompleted + 1;
    const correct = stats.correctOutcomes + (isCorrect ? 1 : 0);
    const goalErr = (Math.abs(predA - actualA) + Math.abs(predB - actualB)) / 2;
    const newStats: PerformanceStats = {
      totalPredicted: stats.totalPredicted, totalCompleted: completed,
      correctOutcomes: correct, exactScores: stats.exactScores + (isExact ? 1 : 0),
      avgError: ((stats.avgError * stats.totalCompleted) + goalErr) / completed,
      accuracyRate: (correct / completed) * 100,
    };
    const ts = new Date().toLocaleTimeString();

    // Prepend WC result to both teams' recentForm so future predictions see it
    const resultA: 'W' | 'D' | 'L' = actualA > actualB ? 'W' : actualA === actualB ? 'D' : 'L';
    const resultB: 'W' | 'D' | 'L' = actualB > actualA ? 'W' : actualA === actualB ? 'D' : 'L';
    const updatedTeams = {
      ...teams,
      [resolvedMatch.teamAId]: {
        ...teams[resolvedMatch.teamAId],
        recentForm: [resultA, ...teams[resolvedMatch.teamAId].recentForm.slice(0, 4)] as ('W' | 'D' | 'L')[],
      },
      [resolvedMatch.teamBId]: {
        ...teams[resolvedMatch.teamBId],
        recentForm: [resultB, ...teams[resolvedMatch.teamBId].recentForm.slice(0, 4)] as ('W' | 'D' | 'L')[],
      },
    };
    setTeams(updatedTeams);
    localStorage.setItem('wc_predictor_teams', JSON.stringify(updatedTeams));

    // Apply math-based weight update immediately
    setMatches(updatedMatches);
    setAgents(updatedAgents);
    setWeightHistory(updatedHistory);
    setStats(newStats);
    setResolveMatchId(null);
    setTerminalLogs(prev => [
      ...prev,
      { agentId: 'learning' as AgentType, agentName: 'Learning Agent', message: `Backpropagation complete. Actual: ${actualA}–${actualB}. Running Gemini analysis...`, timestamp: ts, type: 'system' as const },
      ...log.map(l => ({ agentId: 'learning' as AgentType, agentName: 'Learning Agent', message: l, timestamp: ts, type: 'info' as const })),
    ]);
    saveState(updatedMatches, newStats, updatedHistory, updatedAgents);

    // Fire Gemini Learning Agent async — enriches terminal with AI insights
    const agentCallData = {
      injury:    { scoreA: record.agents.injury.scoreA, scoreB: record.agents.injury.scoreB, confidence: record.agents.injury.confidence, correct: record.agents.injury.correctOutcome, error: record.agents.injury.goalError },
      standings: { scoreA: record.agents.standings.scoreA, scoreB: record.agents.standings.scoreB, confidence: record.agents.standings.confidence, correct: record.agents.standings.correctOutcome, error: record.agents.standings.goalError },
      sentiment: { scoreA: record.agents.sentiment.scoreA, scoreB: record.agents.sentiment.scoreB, confidence: record.agents.sentiment.confidence, correct: record.agents.sentiment.correctOutcome, error: record.agents.sentiment.goalError },
    };
    geminiLearningAgent(
      teamA.name, teamB.name, resolvedMatch.stage,
      { scoreA: actualA, scoreB: actualB },
      agentCallData,
      { previous: currentWeights, updated: newWeights },
      { injury: careerStats.injury.outcomeAccuracy, standings: careerStats.standings.outcomeAccuracy, sentiment: careerStats.sentiment.outcomeAccuracy },
      allRecords.length,
    ).then(ai => {
      const aiTs = new Date().toLocaleTimeString();
      setAgents(prev => prev.map(a => a.id === 'learning' ? { ...a, status: 'done' as const } : a));
      setTerminalLogs(prev => [
        ...prev,
        { agentId: 'learning' as AgentType, agentName: 'Learning Agent', message: `[GEMINI] Deep analysis complete for ${teamA.emoji} ${teamA.name} vs ${teamB.emoji} ${teamB.name}:`, timestamp: aiTs, type: 'consensus' as const },
        ...ai.analysis.map(line => ({ agentId: 'learning' as AgentType, agentName: 'Learning Agent', message: `→ ${line}`, timestamp: aiTs, type: 'data' as const })),
        { agentId: 'learning' as AgentType, agentName: 'Learning Agent', message: `💡 ${ai.insight}`, timestamp: aiTs, type: 'opinion' as const },
      ]);
    }).catch(() => {
      setAgents(prev => prev.map(a => a.id === 'learning' ? { ...a, status: 'idle' as const } : a));
    });
  };

  // ── MATCH FILTERING ──────────────────────────────────────────────────────
  const filteredByGroup = activeGroup === 'All' ? matches : matches.filter(m => (m.stage ?? '').includes(`Group ${activeGroup}`));
  const searchFiltered = searchQuery.trim()
    ? filteredByGroup.filter(m => {
        const q = searchQuery.toLowerCase();
        return teams[m.teamAId]?.name.toLowerCase().includes(q) || teams[m.teamBId]?.name.toLowerCase().includes(q);
      })
    : filteredByGroup;

  // All unique dates that have at least one upcoming match (across all groups)
  const matchDates = [...new Set(
    matches.filter(m => m.status !== 'completed').map(m => m.date.slice(0, 10))
  )].sort();
  const dateIdx    = matchDates.indexOf(selectedDate);
  const canGoPrev  = dateIdx > 0;
  const canGoNext  = dateIdx < matchDates.length - 1;

  const formatNavDate = (d: string) => {
    if (!d) return '';
    const today = new Date().toISOString().slice(0, 10);
    const parsed = new Date(d + 'T12:00:00');
    const label  = parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return d === today ? `Today · ${label}` : label;
  };

  const liveMatches     = searchFiltered.filter(m => m.status === 'predicted' || m.status === 'approved');
  const upcomingMatches = searchFiltered.filter(m => m.status !== 'completed' && (!selectedDate || m.date.slice(0, 10) === selectedDate));
  const completedMatches = searchFiltered.filter(m => m.status === 'completed').slice(0, 5);

  const activeResolveMatch = matches.find(m => m.id === resolveMatchId);


  const getResultOutcome = (m: Match) => {
    if (m.status !== 'completed' || m.actualScoreA === undefined) return null;
    const predA = m.approvedScoreA ?? m.predictedScoreA ?? 0;
    const predB = m.approvedScoreB ?? m.predictedScoreB ?? 0;
    const isExact = predA === m.actualScoreA && predB === m.actualScoreB;
    const predWinner = predA > predB ? 'A' : predA < predB ? 'B' : 'D';
    const actWinner = m.actualScoreA > m.actualScoreB ? 'A' : m.actualScoreA < m.actualScoreB ? 'B' : 'D';
    const correctOutcome = predWinner === actWinner;
    if (isExact) return { label: 'EXACT MATCH +500 PTS', borderColor: 'border-[#FFD700]', badge: 'bg-[#FFD700]/10', text: 'gold-gradient', predicted: `${predA} - ${predB}` };
    if (correctOutcome) return { label: 'WINNER +150 PTS', borderColor: 'border-tertiary', badge: 'bg-tertiary/10', text: 'text-tertiary', predicted: `${predA} - ${predB}` };
    return { label: 'FAILED 0 PTS', borderColor: 'border-error', badge: 'bg-error/10', text: 'text-error', predicted: `${predA} - ${predB}` };
  };

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden">

      {/* ── SIDEBAR (desktop only) ───────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-surface-container border-r border-outline-variant overflow-y-auto">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-outline-variant">
          <h1 className="font-headline text-lg font-bold text-primary" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            AGENT_PREDICT
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">FIFA World Cup 2026</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {[
            { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
            { id: 'predictions', icon: 'analytics', label: 'My Predictions' },
            { id: 'leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as typeof activeNav)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeNav === item.id
                  ? 'bg-secondary-container text-on-secondary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Group filter */}
        <div className="px-3 py-3 border-t border-outline-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Filter by Group</p>
          <div className="flex flex-wrap gap-1">
            {ALL_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                  activeGroup === g
                    ? 'bg-secondary-container border-secondary text-on-secondary-container'
                    : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                {g === 'All' ? 'All' : g}
              </button>
            ))}
          </div>
        </div>

        {/* Agent weights */}
        <div className="px-3 py-3 border-t border-outline-variant">
          <AgentWeights agents={agents} onWeightChange={handleWeightChange} onResetWeights={handleResetWeights} />
        </div>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-outline-variant space-y-1">
          <button
            className="w-full py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity mb-2"
            onClick={() => { localStorage.clear(); window.location.reload(); }}
          >
            Reset All Data
          </button>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl transition-all">
            <span className="material-symbols-outlined text-[20px]">help</span> Help
          </a>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 lg:h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 bg-surface-dim border-b border-outline-variant">
          {/* Mobile: logo */}
          <h1 className="lg:hidden text-base font-black text-secondary" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            AGENT_PREDICT
          </h1>
          {/* Desktop: page title */}
          <h2 className="hidden lg:block text-lg font-bold text-primary" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Match Dashboard
          </h2>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Desktop only */}
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="bg-surface-container-high border-none rounded-full pl-9 pr-4 py-1.5 text-sm w-52 outline-none focus:ring-1 focus:ring-primary text-on-surface"
              />
            </div>
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <div className="bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant">
                <span className="text-on-surface-variant">Accuracy</span>
                <span className="ml-2 font-bold text-tertiary">{Math.round(stats.accuracyRate)}%</span>
              </div>
              <div className="bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant">
                <span className="text-on-surface-variant">Resolved</span>
                <span className="ml-2 font-bold text-primary">{stats.totalCompleted}</span>
              </div>
            </div>
            <button className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant text-[22px]">notifications</button>
            <button className="material-symbols-outlined hidden lg:block p-2 hover:bg-surface-variant rounded-full text-on-surface-variant text-[22px]">settings</button>
          </div>
        </header>

        {/* Scrollable content */}
        {activeNav === 'predictions' && (
          <PredictionsPage teams={teams} stats={stats} />
        )}
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-10 bg-background pb-20 lg:pb-0 ${activeNav !== 'dashboard' ? 'hidden' : ''}`}>

          {/* ── PREDICTION APPROVAL (shows when a prediction is ready) ── */}
          {selectedPrediction && (() => {
            const m = matches.find(x => x.id === selectedPrediction.matchId);
            if (!m) return null;
            return (
              <PredictionApproval
                match={m}
                teamA={teams[m.teamAId]}
                teamB={teams[m.teamBId]}
                agentPredictions={selectedPrediction.agentPredictions}
                finalPrediction={selectedPrediction.finalPrediction}
                onApprove={handleApprovePrediction}
                onReevaluate={handleReevaluatePrediction}
                isThinking={activePredictingId !== null}
              />
            );
          })()}

          {/* ── LIVE / PENDING SECTION ──────────────────────────────────── */}
          {liveMatches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-tertiary rounded-full live-glow inline-block" />
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Active Predictions
                  </h3>
                </div>
                <button
                  onClick={handleResetAllPredictions}
                  className="text-xs text-on-surface-variant hover:text-error font-bold uppercase tracking-wider transition-colors"
                  title="Reset all active predictions back to upcoming"
                >
                  Reset All
                </button>
              </div>
              <div className="flex lg:grid gap-4 overflow-x-auto lg:overflow-x-visible hide-scrollbar -mx-4 lg:mx-0 px-4 lg:px-0 pb-1 lg:pb-0 lg:grid-cols-2">
                {liveMatches.map(match => {
                  const tA = teams[match.teamAId];
                  const tB = teams[match.teamBId];
                  const scoreA = match.approvedScoreA ?? match.predictedScoreA ?? 0;
                  const scoreB = match.approvedScoreB ?? match.predictedScoreB ?? 0;
                  return (
                    <div key={match.id} className="glass-card rounded-xl p-5 relative overflow-hidden shrink-0 w-72 lg:w-auto">
                      <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase rounded-bl-lg ${match.status === 'approved' ? 'bg-secondary text-on-secondary' : 'bg-tertiary text-on-tertiary'}`}>
                        {match.status === 'approved' ? 'APPROVED' : `PREDICTED ${match.confidence}%`}
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        {/* Team A */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                          <img
                            src={getFlagUrl(tA.id)} alt={tA.name}
                            className="w-16 h-12 object-cover rounded-sm shadow-lg border border-outline-variant"
                            onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                          />
                          <span className="text-sm font-bold text-on-surface">{tA.emoji} {tA.name}</span>
                        </div>
                        {/* Score */}
                        <div className="flex items-center gap-4 px-3">
                          <span className="score-display text-on-surface">{scoreA}</span>
                          <span className="text-on-surface-variant font-bold text-xl">:</span>
                          <span className="score-display text-on-surface">{scoreB}</span>
                        </div>
                        {/* Team B */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                          <img
                            src={getFlagUrl(tB.id)} alt={tB.name}
                            className="w-16 h-12 object-cover rounded-sm shadow-lg border border-outline-variant"
                            onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                          />
                          <span className="text-sm font-bold text-on-surface">{tB.emoji} {tB.name}</span>
                        </div>
                      </div>
                      {/* Footer */}
                      <div className="pt-3 border-t border-outline-variant">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-on-surface-variant">{match.stage}</span>
                          <span className="text-secondary font-bold">Confidence {match.confidence}%</span>
                        </div>
                        <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                          <div className="bg-secondary h-full transition-all duration-1000" style={{ width: `${match.confidence ?? 60}%` }} />
                        </div>
                        {match.status === 'approved' && (
                          <button
                            onClick={() => setResolveMatchId(match.id)}
                            className="mt-3 w-full py-2 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            Enter Final Score & Learn
                          </button>
                        )}
                        {match.status === 'predicted' && (
                          <button
                            onClick={() => setSelectedPrediction({ matchId: match.id, agentPredictions: {}, finalPrediction: { scoreA, scoreB, confidence: match.confidence ?? 0, reasoning: [] }, debateLogs: [] })}
                            className="mt-3 w-full py-2 border border-secondary text-secondary rounded-lg text-xs font-bold hover:bg-secondary/10 transition-colors"
                          >
                            Review & Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPrediction(match.id)}
                          className="mt-2 w-full py-1.5 text-on-surface-variant hover:text-error text-[11px] font-medium hover:bg-error/5 rounded-lg transition-colors"
                        >
                          Reset prediction
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── UPCOMING SECTION ────────────────────────────────────────── */}
          <section>
            {/* Section header + date navigation */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Upcoming Predictions
              </h3>
              {/* Date navigator */}
              <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-xl px-1 py-1">
                <button
                  onClick={() => canGoPrev && setSelectedDate(matchDates[dateIdx - 1])}
                  disabled={!canGoPrev}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-variant disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-xs font-bold text-on-surface px-3 min-w-[130px] text-center">
                  {formatNavDate(selectedDate)}
                </span>
                <button
                  onClick={() => canGoNext && setSelectedDate(matchDates[dateIdx + 1])}
                  disabled={!canGoNext}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-variant disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-sm">
                No matches on {formatNavDate(selectedDate)}{activeGroup !== 'All' ? ` in Group ${activeGroup}` : ''}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingMatches.map(match => {
                  const tA = teams[match.teamAId];
                  const tB = teams[match.teamBId];
                  const isPredicting = activePredictingId === match.id;
                  const isManual = manualMatchId === match.id;
                  const matchTime = new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={match.id} className="bg-surface-container-high rounded-xl p-4 lg:p-5 flex flex-col border border-outline-variant hover:border-primary transition-colors">

                      {/* Mobile layout: teams + time on one row */}
                      <div className="flex lg:hidden items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <img src={getFlagUrl(tA.id)} alt={tA.name} className="w-8 h-6 object-cover rounded-sm border border-outline-variant"
                              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{tA.id}</span>
                          </div>
                          <span className="text-secondary font-bold text-sm">VS</span>
                          <div className="flex flex-col items-center gap-1">
                            <img src={getFlagUrl(tB.id)} alt={tB.name} className="w-8 h-6 object-cover rounded-sm border border-outline-variant"
                              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{tB.id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase">{match.stage}</p>
                          <p className="text-sm font-bold text-on-surface">{matchTime}</p>
                        </div>
                      </div>

                      {/* Desktop layout: date + stage row, then flags centered */}
                      <div className="hidden lg:flex justify-between items-center mb-4">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{matchTime}</span>
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase">{match.stage}</span>
                      </div>
                      <div className="hidden lg:flex justify-around items-center mb-5">
                        <div className="flex flex-col items-center gap-2">
                          <img src={getFlagUrl(tA.id)} alt={tA.name} className="w-12 h-9 object-cover rounded-sm border border-outline-variant"
                            onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { textContent: tA.emoji, className: 'text-3xl' })); }} />
                          <span className="text-xs font-medium text-on-surface">{tA.name}</span>
                        </div>
                        <span className="text-on-surface-variant font-bold text-base">VS</span>
                        <div className="flex flex-col items-center gap-2">
                          <img src={getFlagUrl(tB.id)} alt={tB.name} className="w-12 h-9 object-cover rounded-sm border border-outline-variant"
                            onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { textContent: tB.emoji, className: 'text-3xl' })); }} />
                          <span className="text-xs font-medium text-on-surface">{tB.name}</span>
                        </div>
                      </div>

                      {/* Manual predict inline form — desktop only */}
                      {isManual && (
                        <div className="hidden lg:block mb-3 p-3 bg-surface-container rounded-xl border border-outline-variant">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 text-center">Enter your prediction</p>
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-on-surface-variant">{tA.name}</span>
                              <input
                                type="number" min="0" max="9"
                                value={manualScoreA}
                                onChange={e => setManualScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 bg-surface-container-highest border border-outline-variant rounded-lg p-1.5 text-center text-base font-black text-on-surface outline-none focus:border-primary"
                              />
                            </div>
                            <span className="text-on-surface-variant font-bold text-lg mt-4">-</span>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-on-surface-variant">{tB.name}</span>
                              <input
                                type="number" min="0" max="9"
                                value={manualScoreB}
                                onChange={e => setManualScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 bg-surface-container-highest border border-outline-variant rounded-lg p-1.5 text-center text-base font-black text-on-surface outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleManualPredict(match.id)}
                              className="flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                              Lock In
                            </button>
                            <button
                              onClick={() => setManualMatchId(null)}
                              className="px-3 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs hover:bg-surface-variant transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mobile action buttons — open full-screen sheet */}
                      {match.status === 'upcoming' ? (
                        <div className="grid grid-cols-2 gap-2 mt-auto lg:hidden">
                          <button
                            onClick={() => { setMobileSheetMatchId(match.id); setMobileSheetAIMode(false); }}
                            disabled={isPredicting || activePredictingId !== null}
                            className="py-2.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Manual
                          </button>
                          <button
                            onClick={() => { setMobileSheetMatchId(match.id); setMobileSheetAIMode(true); }}
                            disabled={isPredicting || activePredictingId !== null}
                            className="py-2.5 border border-secondary text-secondary rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            AI Auto
                          </button>
                        </div>
                      ) : (
                        <div className="mt-auto lg:hidden">
                          <div className={`text-center text-[10px] font-bold uppercase tracking-wider mb-2 ${match.status === 'approved' ? 'text-secondary' : 'text-tertiary'}`}>
                            {match.status === 'approved' ? `Approved ${(match.approvedScoreA ?? 0)}–${(match.approvedScoreB ?? 0)}` : `Predicted ${(match.predictedScoreA ?? 0)}–${(match.predictedScoreB ?? 0)} · ${match.confidence}%`}
                          </div>
                          <button
                            onClick={() => handleResetPrediction(match.id)}
                            className="w-full py-2.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:border-error hover:text-error active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            Reset prediction
                          </button>
                        </div>
                      )}

                      {/* Desktop action buttons — inline form + terminal flow */}
                      {match.status === 'upcoming' ? (
                        <div className="hidden lg:flex flex-col gap-2 mt-auto">
                          <button
                            onClick={() => { setManualMatchId(match.id); setManualScoreA(0); setManualScoreB(0); }}
                            disabled={isPredicting || activePredictingId !== null || isManual}
                            className="py-2.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Manual Prediction
                          </button>
                          <button
                            onClick={() => handleTriggerPrediction(match.id)}
                            disabled={isPredicting || activePredictingId !== null || isManual}
                            className="py-2.5 border border-secondary text-secondary rounded-lg text-xs font-bold hover:bg-secondary/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            {isPredicting ? 'Agents Running...' : 'AI Auto-Predict'}
                          </button>
                        </div>
                      ) : (
                        <div className="hidden lg:flex flex-col gap-2 mt-auto">
                          <div className={`text-center text-[11px] font-bold uppercase tracking-wider ${match.status === 'approved' ? 'text-secondary' : 'text-tertiary'}`}>
                            {match.status === 'approved' ? `Approved ${(match.approvedScoreA ?? 0)}–${(match.approvedScoreB ?? 0)}` : `Predicted ${(match.predictedScoreA ?? 0)}–${(match.predictedScoreB ?? 0)} · ${match.confidence}%`}
                          </div>
                          <button
                            onClick={() => handleResetPrediction(match.id)}
                            className="py-2.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-bold hover:border-error hover:text-error transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            Reset prediction
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── COMPLETED SECTION ───────────────────────────────────────── */}
          {completedMatches.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Recent Results
              </h3>
              <div className="space-y-3">
                {completedMatches.map(match => {
                  const tA = teams[match.teamAId];
                  const tB = teams[match.teamBId];
                  const outcome = getResultOutcome(match);
                  return (
                    <div key={match.id} className={`bg-surface-container rounded-xl px-5 py-4 flex items-center justify-between border-l-4 ${outcome?.borderColor ?? 'border-outline-variant'}`}>
                      {/* Match info */}
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          <img src={getFlagUrl(tA.id)} alt={tA.name} className="w-8 h-6 rounded-sm object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                          <span className="text-sm font-medium text-on-surface truncate">{tA.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          <span>{match.actualScoreA}</span>
                          <span className="text-on-surface-variant">-</span>
                          <span>{match.actualScoreB}</span>
                        </div>
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          <span className="text-sm font-medium text-on-surface truncate text-right flex-1">{tB.name}</span>
                          <img src={getFlagUrl(tB.id)} alt={tB.name} className="w-8 h-6 rounded-sm object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                        </div>
                      </div>
                      {/* Outcome */}
                      {outcome && (
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">PREDICTED</p>
                            <p className="font-bold text-sm text-on-surface">{outcome.predicted}</p>
                          </div>
                          <div className={`${outcome.badge} px-3 py-1 rounded-full`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${outcome.text}`}>{outcome.label}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── AGENT TERMINAL (desktop only) ──────────────────────────── */}
          <section className="hidden lg:block">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Multi-Agent Console
            </h3>
            <AgentTerminal logs={terminalLogs} agents={agents} onClearLogs={() => setTerminalLogs([])} />
          </section>

          {/* ── STATS (desktop only) ───────────────────────────────────── */}
          <section className="hidden lg:block">
            <StatsOverview stats={stats} weightHistory={weightHistory} />
          </section>

        </div>{/* end scrollable */}
      </main>

      {/* ── MOBILE PREDICTION SHEET ─────────────────────────────────── */}
      {mobileSheetMatchId && (() => {
        const m = matches.find(x => x.id === mobileSheetMatchId);
        if (!m) return null;
        return (
          <MobilePredictionSheet
            match={m}
            teamA={teams[m.teamAId]}
            teamB={teams[m.teamBId]}
            agents={agents}
            initialAIMode={mobileSheetAIMode}
            onClose={() => setMobileSheetMatchId(null)}
            onLockIn={(matchId, sA, sB) => {
              handleManualPredict(matchId);
              // override the scores set by handleManualPredict
              setMatches(prev => prev.map(mx => mx.id === matchId
                ? { ...mx, status: 'approved' as const, predictedScoreA: sA, predictedScoreB: sB, approvedScoreA: sA, approvedScoreB: sB, confidence: 100 }
                : mx
              ));
              setMobileSheetMatchId(null);
            }}
          />
        );
      })()}

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface-container border-t border-outline-variant flex justify-around items-center px-4">
        {[
          { id: 'dashboard',   icon: 'dashboard',   label: 'Dashboard' },
          { id: 'predictions', icon: 'query_stats',  label: 'Predictions' },
          { id: 'leaderboard', icon: 'leaderboard',  label: 'Leaderboard' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id as typeof activeNav)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
              activeNav === item.id ? 'text-secondary' : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={activeNav === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}
      {resolveMatchId && activeResolveMatch && (
        <ResolveMatchModal
          match={activeResolveMatch}
          teamA={teams[activeResolveMatch.teamAId]}
          teamB={teams[activeResolveMatch.teamBId]}
          agentPredictions={
            selectedPrediction?.matchId === resolveMatchId
              ? selectedPrediction.agentPredictions
              : runMatchPredictionSync(teams[activeResolveMatch.teamAId], teams[activeResolveMatch.teamBId], getWeightsObj(agents)).agentPredictions
          }
          currentWeights={getWeightsObj(agents)}
          onClose={() => setResolveMatchId(null)}
          onConfirmResolve={handleResolveMatch}
        />
      )}
    </div>
  );
};
