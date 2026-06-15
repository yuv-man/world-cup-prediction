import React, { useState } from 'react';
import type { Match, Team, AgentState } from '../types';
import { getMatchSentiment } from '../data/worldcupData';
import { runMatchPrediction } from '../agents/agentEngine';

function getFlagUrl(teamId: string): string {
  const isoMap: Record<string, string> = {
    MEX:'mx', RSA:'za', KOR:'kr', CZE:'cz', CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
    BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct', USA:'us', PAR:'py', AUS:'au', TUR:'tr',
    GER:'de', CUW:'cw', CIV:'ci', ECU:'ec', NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
    BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz', ESP:'es', CPV:'cv', KSA:'sa', URU:'uy',
    FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no', ARG:'ar', DZA:'dz', AUT:'at', JOR:'jo',
    POR:'pt', COD:'cd', UZB:'uz', COL:'co', ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
  };
  const c = isoMap[teamId];
  return c ? `https://flagcdn.com/w80/${c}.png` : '';
}

interface MobilePredictionSheetProps {
  match: Match;
  teamA: Team;
  teamB: Team;
  agents: AgentState[];
  initialAIMode?: boolean;
  onClose: () => void;
  onLockIn: (matchId: string, scoreA: number, scoreB: number) => void;
}

export const MobilePredictionSheet: React.FC<MobilePredictionSheetProps> = ({
  match, teamA, teamB, agents, initialAIMode = false, onClose, onLockIn,
}) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [aiActive, setAiActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(0);

  const sentiment = getMatchSentiment(teamA.id, teamB.id);
  const weights = {
    injury:    agents.find(a => a.id === 'injury')?.weight    ?? 0.3,
    standings: agents.find(a => a.id === 'standings')?.weight ?? 0.4,
    sentiment: agents.find(a => a.id === 'sentiment')?.weight ?? 0.3,
  };

  const matchDate = new Date(match.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Circular gauge maths (r=28)
  const circumference = 2 * Math.PI * 28;
  const displayConfidence = aiActive && aiConfidence > 0 ? aiConfidence : Math.max(sentiment.winA, sentiment.winB);
  const dashOffset = circumference * (1 - displayConfidence / 100);
  const advantage = aiActive
    ? (scoreA > scoreB ? teamA.name : scoreA < scoreB ? teamB.name : 'Draw')
    : (sentiment.winA > sentiment.winB ? teamA.name : sentiment.winB > sentiment.winA ? teamB.name : 'Draw');

  const handleAIToggle = async () => {
    if (aiActive) { setAiActive(false); setAiConfidence(0); return; }
    setAiLoading(true);
    setAiActive(true);
    try {
      const result = await runMatchPrediction(teamA, teamB, weights, () => {});
      setScoreA(result.finalPrediction.scoreA);
      setScoreB(result.finalPrediction.scoreB);
      setAiConfidence(result.finalPrediction.confidence);
    } catch {
      // fallback: use sentiment-derived scores
      setScoreA(sentiment.winA > sentiment.winB ? 2 : 1);
      setScoreB(sentiment.winA > sentiment.winB ? 1 : 2);
      setAiConfidence(Math.max(sentiment.winA, sentiment.winB));
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger AI on mount if opened via AI button
  React.useEffect(() => {
    if (initialAIMode) handleAIToggle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScore = (side: 'A' | 'B', delta: number) => {
    if (side === 'A') setScoreA(v => Math.max(0, v + delta));
    else              setScoreB(v => Math.max(0, v + delta));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-outline-variant bg-surface">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-primary active:scale-90 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-secondary">AGENT_PREDICT</span>
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Match Prediction</span>
          </div>
        </div>
        {aiLoading && (
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="w-1.5 h-1.5 bg-secondary rounded-full pulse-live inline-block" />
            AI Thinking...
          </div>
        )}
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">

        {/* Match Context */}
        <div className="flex items-center justify-between py-5 px-4 bg-surface-container rounded-xl border border-outline-variant relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,202,69,0.2),transparent_70%)]" />
          {/* Team A */}
          <div className="flex flex-col items-center gap-2 flex-1 z-10">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center border-2 border-secondary overflow-hidden">
              <img src={getFlagUrl(teamA.id)} alt={teamA.name} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
            <span className="text-sm font-bold text-on-surface">{teamA.name}</span>
          </div>
          {/* VS */}
          <div className="flex flex-col items-center z-10 px-2">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{match.stage}</span>
            <span className="text-2xl font-black text-on-surface-variant">VS</span>
            <span className="text-[9px] text-on-surface-variant">{matchDate}</span>
          </div>
          {/* Team B */}
          <div className="flex flex-col items-center gap-2 flex-1 z-10">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center border-2 border-outline-variant overflow-hidden">
              <img src={getFlagUrl(teamB.id)} alt={teamB.name} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
            <span className="text-sm font-bold text-on-surface">{teamB.name}</span>
          </div>
        </div>

        {/* Score Prediction */}
        <section className="glass-card rounded-xl p-4 flex flex-col gap-4">
          {/* Title + AI toggle */}
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-on-surface">Score Prediction</h2>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">AI AUTO</span>
              <button
                onClick={handleAIToggle}
                disabled={aiLoading}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${aiActive ? 'bg-secondary-container' : 'bg-outline-variant'}`}
              >
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform duration-300 ${aiActive ? 'translate-x-5 bg-secondary' : 'bg-on-surface'}`} />
              </button>
            </div>
          </div>

          {/* Steppers */}
          <div className="flex items-center justify-around py-2">
            {/* Team A stepper */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => changeScore('A', 1)}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-highest border border-outline-variant rounded-lg active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-secondary">add</span>
              </button>
              <span
                className="text-5xl font-black text-on-surface transition-transform"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
              >
                {aiLoading ? '·' : scoreA}
              </span>
              <button
                onClick={() => changeScore('A', -1)}
                disabled={scoreA === 0}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-highest border border-outline-variant rounded-lg active:scale-95 transition-transform disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-on-surface-variant">remove</span>
              </button>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">{teamA.id}</span>
            </div>

            <div className="h-20 w-px bg-outline-variant" />

            {/* Team B stepper */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => changeScore('B', 1)}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-highest border border-outline-variant rounded-lg active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-secondary">add</span>
              </button>
              <span
                className="text-5xl font-black text-on-surface transition-transform"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
              >
                {aiLoading ? '·' : scoreB}
              </span>
              <button
                onClick={() => changeScore('B', -1)}
                disabled={scoreB === 0}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-highest border border-outline-variant rounded-lg active:scale-95 transition-transform disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-on-surface-variant">remove</span>
              </button>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">{teamB.id}</span>
            </div>
          </div>
        </section>

        {/* Community Consensus */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">groups</span>
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest">Community Consensus</h3>
          </div>
          <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
            {[
              { label: `${teamA.name} Win`, pct: sentiment.winA, color: 'bg-secondary' },
              { label: 'Draw',              pct: sentiment.draw, color: 'bg-on-surface-variant' },
              { label: `${teamB.name} Win`, pct: sentiment.winB, color: 'bg-outline' },
            ].map(row => (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <span>{row.label}</span>
                  <span className={row.color === 'bg-secondary' ? 'text-secondary' : ''}>{row.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Analyst Probability */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">analytics</span>
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest">Analyst Probability</h3>
          </div>
          <div className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-secondary">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Confidence Meter</span>
              <span className="text-sm font-bold text-on-surface mt-0.5">
                {advantage === 'Draw' ? 'Likely Draw' : `Advantage: ${advantage}`}
              </span>
            </div>
            {/* Circular gauge */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-surface-variant" />
                <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4"
                  className="text-secondary transition-all duration-700"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-secondary">{displayConfidence}%</span>
            </div>
          </div>
        </section>

      </div>

      {/* Fixed CTA */}
      <div className="shrink-0 px-4 pb-6 pt-3 bg-surface-container border-t border-outline-variant">
        <button
          onClick={() => onLockIn(match.id, scoreA, scoreB)}
          disabled={aiLoading}
          className="w-full h-12 bg-secondary text-on-secondary font-bold text-sm rounded-lg shadow-[0_4px_20px_-4px_rgba(255,202,69,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          <span>LOCK IN PREDICTION</span>
          <span className="material-symbols-outlined text-[18px]">lock</span>
        </button>
      </div>
    </div>
  );
};
