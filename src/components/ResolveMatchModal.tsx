import React, { useState } from 'react';
import type { Match, Team, AgentPrediction } from '../types';
import {
  loadRecords,
  buildPredictionRecord,
  computeNewWeights,
  computeLearningStats,
} from '../services/learningService';
import type { LearningUpdateResult } from '../services/learningService';
import { X, Trophy, CheckCircle, ArrowRight, Activity, TrendingUp, Target } from 'lucide-react';

interface ResolveMatchModalProps {
  match: Match;
  teamA: Team;
  teamB: Team;
  agentPredictions: Record<string, AgentPrediction>;
  currentWeights: { injury: number; standings: number; sentiment: number };
  onClose: () => void;
  onConfirmResolve: (matchId: string, actualA: number, actualB: number) => void;
}

export const ResolveMatchModal: React.FC<ResolveMatchModalProps> = ({
  match,
  teamA,
  teamB,
  agentPredictions,
  currentWeights,
  onClose,
  onConfirmResolve,
}) => {
  const [actualScoreA, setActualScoreA] = useState<number>(match.approvedScoreA ?? 0);
  const [actualScoreB, setActualScoreB] = useState<number>(match.approvedScoreB ?? 0);
  const [learningResult, setLearningResult] = useState<LearningUpdateResult | null>(null);

  const getAgentLabel = (id: string) => {
    if (id === 'injury') return 'Injury';
    if (id === 'standings') return 'Form & ELO';
    if (id === 'sentiment') return 'Sentiment';
    return id;
  };

  const handleRunFeedback = () => {
    // Build a weighted final prediction from agent preds + current weights
    const finalPred: AgentPrediction = {
      scoreA: Math.round(
        (agentPredictions.injury?.scoreA ?? 0) * currentWeights.injury +
        (agentPredictions.standings?.scoreA ?? 0) * currentWeights.standings +
        (agentPredictions.sentiment?.scoreA ?? 0) * currentWeights.sentiment
      ),
      scoreB: Math.round(
        (agentPredictions.injury?.scoreB ?? 0) * currentWeights.injury +
        (agentPredictions.standings?.scoreB ?? 0) * currentWeights.standings +
        (agentPredictions.sentiment?.scoreB ?? 0) * currentWeights.sentiment
      ),
      confidence: Math.round(
        (agentPredictions.injury?.confidence ?? 65) * currentWeights.injury +
        (agentPredictions.standings?.confidence ?? 65) * currentWeights.standings +
        (agentPredictions.sentiment?.confidence ?? 65) * currentWeights.sentiment
      ),
      reasoning: [],
    };

    const record = buildPredictionRecord(
      match, agentPredictions, finalPred,
      actualScoreA, actualScoreB, currentWeights,
    );
    const existingRecords = loadRecords();
    const allRecords = [...existingRecords, record]; // preview only — not saved yet

    const result = computeNewWeights(currentWeights, record, allRecords);
    setLearningResult(result);
  };

  // Cumulative stats from already-saved records (preview only, not including this match yet)
  const existingStats = computeLearningStats(loadRecords());

  return (
    <div className="modal-backdrop">
      <div className="modal-content bg-surface-container-high border border-outline-variant rounded-xl p-6 flex flex-col gap-6 max-w-xl w-full text-on-surface">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-amber-500 w-5 h-5" />
            Resolve Fixture Arena
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!learningResult ? (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-slate-400">
              Input the final score to run the learning loop. Agent weights will be updated based on this match and cumulative history ({existingStats.totalRecords} records saved).
            </p>

            {/* Cumulative agent accuracy preview */}
            {existingStats.totalRecords > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {(['injury', 'standings', 'sentiment'] as const).map(key => {
                  const s = existingStats[key];
                  return (
                    <div key={key} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col gap-1 items-center">
                      <span className="text-[10px] text-slate-400 font-bold">{getAgentLabel(key)}</span>
                      <span className="text-base font-black text-white">{s.outcomeAccuracy}%</span>
                      <span className="text-[9px] text-slate-500">career accuracy</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        s.recentAccuracy >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        s.recentAccuracy >= 50 ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {s.recentAccuracy}% recent
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score input */}
            <div className="bg-slate-950/65 rounded-xl border border-slate-900 p-6 flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-6 w-full">
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-4xl">{teamA.emoji}</span>
                  <span className="font-extrabold text-sm text-slate-200 truncate w-full text-center">{teamA.name}</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl">
                  <input
                    type="number" min="0" max="9" value={actualScoreA}
                    onChange={e => setActualScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-center text-xl font-black text-white outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-500 font-bold text-lg">:</span>
                  <input
                    type="number" min="0" max="9" value={actualScoreB}
                    onChange={e => setActualScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-center text-xl font-black text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-4xl">{teamB.emoji}</span>
                  <span className="font-extrabold text-sm text-slate-200 truncate w-full text-center">{teamB.name}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRunFeedback}
              className="btn-success text-xs py-3 flex items-center justify-center gap-2 font-bold"
            >
              <Activity className="w-4 h-4 animate-pulse" />
              Analyze Results & Feed Learning Loop
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 learning-flow-container">
            <div className="learning-flow-line" />

            <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-400">Learning Loop Processed</h3>
                <p className="text-[11px] text-emerald-500/80 leading-relaxed mt-0.5">
                  Weights recalculated using this match + {existingStats.totalRecords} saved records. Cumulative accuracy drives long-term signal.
                </p>
              </div>
            </div>

            {/* Per-agent this-match accuracy */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3 h-3" /> This Match — Agent Calls
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {(['injury', 'standings', 'sentiment'] as const).map(key => {
                  const pred = agentPredictions[key];
                  if (!pred) return null;
                  const predWinner = pred.scoreA > pred.scoreB ? 'A' : pred.scoreA < pred.scoreB ? 'B' : 'D';
                  const actualWinner = actualScoreA > actualScoreB ? 'A' : actualScoreA < actualScoreB ? 'B' : 'D';
                  const correct = predWinner === actualWinner;
                  const err = ((Math.abs(pred.scoreA - actualScoreA) + Math.abs(pred.scoreB - actualScoreB)) / 2).toFixed(1);
                  return (
                    <div key={key} className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 flex flex-col gap-1 items-center">
                      <span className="text-[10px] text-slate-400 font-bold">{getAgentLabel(key)}</span>
                      <span className="text-sm font-bold font-mono text-slate-200">{pred.scoreA}–{pred.scoreB}</span>
                      <span className="text-[10px] text-slate-500">err {err}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                        correct ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {correct ? 'Correct ✓' : 'Wrong ✗'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weight calibration */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Weight Calibration
              </h4>
              <div className="flex flex-col gap-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                {(['injury', 'standings', 'sentiment'] as const).map(key => {
                  const prev = learningResult.previousWeights[key];
                  const next = learningResult.newWeights[key];
                  const diff = next - prev;
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-mono font-medium">
                        <span className="text-slate-300 font-semibold">{getAgentLabel(key)}</span>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-500">{Math.round(prev * 100)}%</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-indigo-400 font-bold">{Math.round(next * 100)}%</span>
                          <span className={`ml-1.5 font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {diff >= 0 ? `+${Math.round(diff * 100)}%` : `${Math.round(diff * 100)}%`}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden flex relative">
                        <div className="h-full bg-slate-700/80 rounded-l" style={{ width: `${prev * 100}%` }} />
                        {diff >= 0 ? (
                          <div className="h-full bg-emerald-500 animate-pulse" style={{ width: `${diff * 100}%` }} />
                        ) : (
                          <div className="absolute h-full bg-red-600/40" style={{ width: `${Math.abs(diff) * 100}%`, left: `${next * 100}%` }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Log feed */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-900 font-mono text-[10px] text-slate-500 leading-relaxed max-h-[80px] overflow-y-auto">
              <span className="text-slate-400 font-bold block mb-1">LEARNING_LOG:</span>
              {learningResult.log.slice(1).map((line, idx) => (
                <div key={idx} className="truncate">{line}</div>
              ))}
            </div>

            <button
              onClick={() => onConfirmResolve(match.id, actualScoreA, actualScoreB)}
              className="btn-primary text-xs py-3.5 flex items-center justify-center gap-1.5 font-bold mt-2"
            >
              <TrendingUp className="w-4 h-4" />
              Lock Calibration & Save Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
