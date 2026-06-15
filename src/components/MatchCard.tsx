import React from 'react';
import type { Match, Team } from '../types';
import { Play, Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  teamA: Team;
  teamB: Team;
  onPredict: (matchId: string) => void;
  onResolve: (matchId: string) => void;
  activePredictingId: string | null;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  teamA,
  teamB,
  onPredict,
  onResolve,
  activePredictingId,
}) => {
  const isPredicting = activePredictingId === match.id;
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'predicted':
        return <span className="status-badge status-predicted">Pending Approval</span>;
      case 'approved':
        return <span className="status-badge status-approved">Approved</span>;
      case 'completed':
        return <span className="status-badge status-completed">Completed</span>;
      default:
        return <span className="status-badge status-upcoming">Upcoming</span>;
    }
  };

  // Evaluate prediction accuracy
  const getPredictionAccuracyDetails = () => {
    if (match.status !== 'completed' || match.actualScoreA === undefined || match.actualScoreB === undefined) {
      return null;
    }
    
    const predA = match.approvedScoreA ?? match.predictedScoreA ?? 0;
    const predB = match.approvedScoreB ?? match.predictedScoreB ?? 0;
    const actA = match.actualScoreA;
    const actB = match.actualScoreB;

    const isExact = predA === actA && predB === actB;
    
    const predDiff = predA - predB;
    const actDiff = actA - actB;
    const correctOutcome = (predDiff > 0 && actDiff > 0) || (predDiff < 0 && actDiff < 0) || (predDiff === 0 && actDiff === 0);

    if (isExact) {
      return {
        label: 'Exact Score!',
        color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
        icon: <Sparkles className="w-3.5 h-3.5" />
      };
    } else if (correctOutcome) {
      return {
        label: 'Outcome Hit',
        color: 'border-sky-500/40 bg-sky-950/20 text-sky-400',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      };
    } else {
      return {
        label: 'Incorrect Goal Difference',
        color: 'border-red-500/40 bg-red-950/20 text-red-400',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
      };
    }
  };

  const accuracyDetails = getPredictionAccuracyDetails();

  return (
    <div className={`glass-card relative border transition-all ${
      isPredicting ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)]' : 
      accuracyDetails ? accuracyDetails.color : 'border-slate-800'
    }`}>
      {/* Top details */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3">
        <span>{match.stage} • {formatDate(match.date)}</span>
        {getStatusBadge()}
      </div>

      {/* Main Match Arena Board */}
      <div className="grid grid-cols-5 items-center gap-2 mb-4">
        {/* Team A */}
        <div className="col-span-2 flex flex-col items-center text-center gap-1.5">
          <span className="text-3xl filter drop-shadow-md select-none">{teamA.emoji}</span>
          <span className="font-bold text-xs text-slate-200 truncate w-full">{teamA.name}</span>
          <span className="text-[9px] text-slate-500">FIFA #{teamA.fifaRank}</span>
        </div>

        {/* Score display */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === 'upcoming' && (
            <span className="text-sm font-semibold text-slate-600">VS</span>
          )}

          {match.status === 'predicted' && (
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold font-mono text-amber-500">
                {match.predictedScoreA} - {match.predictedScoreB}
              </span>
              <span className="text-[8px] text-amber-500 font-semibold uppercase tracking-wider">
                Pred ({match.confidence}%)
              </span>
            </div>
          )}

          {match.status === 'approved' && (
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold font-mono text-purple-400">
                {match.approvedScoreA} - {match.approvedScoreB}
              </span>
              <span className="text-[8px] text-purple-400 font-semibold uppercase tracking-wider">
                Approved
              </span>
            </div>
          )}

          {match.status === 'completed' && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-bold font-mono text-slate-200">
                {match.actualScoreA} - {match.actualScoreB}
              </span>
              <span className="text-[9px] text-slate-500 line-through font-mono">
                P: {match.approvedScoreA ?? match.predictedScoreA} - {match.approvedScoreB ?? match.predictedScoreB}
              </span>
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="col-span-2 flex flex-col items-center text-center gap-1.5">
          <span className="text-3xl filter drop-shadow-md select-none">{teamB.emoji}</span>
          <span className="font-bold text-xs text-slate-200 truncate w-full">{teamB.name}</span>
          <span className="text-[9px] text-slate-500">FIFA #{teamB.fifaRank}</span>
        </div>
      </div>

      {/* Accuracy Tag for completed matches */}
      {accuracyDetails && (
        <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border text-[10px] font-semibold mb-3">
          {accuracyDetails.icon}
          <span>{accuracyDetails.label}</span>
        </div>
      )}

      {/* Action panel */}
      <div className="mt-2 pt-2 border-t border-slate-900/60 flex justify-end">
        {match.status === 'upcoming' && (
          <button
            onClick={() => onPredict(match.id)}
            disabled={isPredicting || activePredictingId !== null}
            className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
          >
            {isPredicting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Agents Discussing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Predict with Agents
              </>
            )}
          </button>
        )}

        {match.status === 'predicted' && (
          <div className="w-full flex justify-between items-center gap-2">
            <span className="text-[10px] text-amber-500/80 animate-pulse flex items-center gap-1">
              💬 Ready for Approval
            </span>
            <button
              onClick={() => onPredict(match.id)} // re-runs prediction or displays approval panel
              disabled={activePredictingId !== null}
              className="btn-secondary text-xs py-1 px-3 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
            >
              Verify Detail
            </button>
          </div>
        )}

        {match.status === 'approved' && (
          <button
            onClick={() => onResolve(match.id)}
            disabled={activePredictingId !== null}
            className="w-full btn-success text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            Simulate & Update Weights
          </button>
        )}

        {match.status === 'completed' && (
          <div className="text-[9px] text-slate-500 flex items-center justify-between w-full">
            <span>Weights Updated</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              ✓ Learning Loop Ran
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
