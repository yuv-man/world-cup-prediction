import React, { useState } from 'react';
import type { Match, Team, AgentPrediction } from '../types';
import { Check, Sparkles } from 'lucide-react';

interface PredictionApprovalProps {
  match: Match;
  teamA: Team;
  teamB: Team;
  agentPredictions: Record<string, AgentPrediction>;
  finalPrediction: AgentPrediction;
  onApprove: (matchId: string, approvedA: number, approvedB: number) => void;
  onReevaluate: (matchId: string, hint: string) => void;
  isThinking: boolean;
}

const AGENT_STYLES: Record<string, { border: string; icon: string }> = {
  injury:    { border: 'border-l-error',     icon: '🏥' },
  standings: { border: 'border-l-secondary', icon: '📊' },
  sentiment: { border: 'border-l-tertiary',  icon: '🗣️' },
};

export const PredictionApproval: React.FC<PredictionApprovalProps> = ({
  match, teamA, teamB, agentPredictions, finalPrediction, onApprove, onReevaluate, isThinking,
}) => {
  const [scoreA, setScoreA] = useState<number>(finalPrediction.scoreA);
  const [scoreB, setScoreB] = useState<number>(finalPrediction.scoreB);
  const [hint, setHint] = useState<string>('');

  return (
    <div className="bg-surface-container-high rounded-xl border border-outline-variant p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          🎯 Prediction Review
        </h2>
        <span className="text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
          Confidence {finalPrediction.confidence}%
        </span>
      </div>

      {/* Score board */}
      <div className="bg-surface-container rounded-xl p-5 border border-outline-variant flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{teamA.emoji}</span>
          <span className="text-sm font-bold text-on-surface">{teamA.name}</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-surface-container-highest rounded-xl border border-outline-variant">
          <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>{finalPrediction.scoreA}</span>
          <span className="text-on-surface-variant font-bold text-xl">:</span>
          <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>{finalPrediction.scoreB}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{teamB.emoji}</span>
          <span className="text-sm font-bold text-on-surface">{teamB.name}</span>
        </div>
      </div>

      {/* Specialist breakdown */}
      {Object.entries(agentPredictions).length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(agentPredictions).map(([id, pred]) => {
            const style = AGENT_STYLES[id] ?? { border: 'border-l-outline', icon: '🤖' };
            const name = id === 'injury' ? 'Injury' : id === 'standings' ? 'Form & ELO' : 'Sentiment';
            return (
              <div key={id} className={`bg-surface-container rounded-lg border-l-4 ${style.border} p-3 flex flex-col gap-1.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">{style.icon} {name}</span>
                  <span className="text-xs font-mono font-bold text-on-surface-variant">{pred.scoreA}–{pred.scoreB}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant">{pred.confidence}% confidence</div>
                {pred.reasoning[0] && <p className="text-[10px] text-on-surface-variant leading-relaxed truncate">{pred.reasoning[0]}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust & Approve */}
      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-3">
        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Adjust & Lock Score</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">{teamA.name}</span>
            <input type="number" min="0" max="9" value={scoreA}
              onChange={e => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 bg-surface-container-highest border border-outline-variant rounded-lg p-2 text-center text-sm font-bold text-secondary outline-none focus:border-secondary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">{teamB.name}</span>
            <input type="number" min="0" max="9" value={scoreB}
              onChange={e => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 bg-surface-container-highest border border-outline-variant rounded-lg p-2 text-center text-sm font-bold text-secondary outline-none focus:border-secondary"
            />
          </div>
          <button onClick={() => onApprove(match.id, scoreA, scoreB)} disabled={isThinking}
            className="flex-1 py-2.5 bg-tertiary text-on-tertiary rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50">
            <Check className="w-4 h-4" /> Approve Prediction
          </button>
        </div>
      </div>

      {/* Reevaluate */}
      <form onSubmit={e => { e.preventDefault(); if (hint.trim()) { onReevaluate(match.id, hint); setHint(''); } }}
        className="flex gap-2 pt-2 border-t border-outline-variant">
        <input type="text" value={hint} onChange={e => setHint(e.target.value)} disabled={isThinking}
          placeholder='Override hint — e.g. "Assume Messi is resting"'
          className="flex-1 bg-surface-container border border-outline-variant text-sm rounded-lg px-3 py-2 outline-none focus:border-secondary text-on-surface placeholder:text-on-surface-variant/50"
        />
        <button type="submit" disabled={isThinking || !hint.trim()}
          className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-sm font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50">
          <Sparkles className="w-3.5 h-3.5" /> Re-run
        </button>
      </form>
    </div>
  );
};
