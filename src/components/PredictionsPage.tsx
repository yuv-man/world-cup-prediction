import React, { useState } from 'react';
import type { Team, PerformanceStats } from '../types';
import type { PredictionRecord } from '../types';
import { loadRecords } from '../services/learningService';

interface PredictionsPageProps {
  teams: Record<string, Team>;
  stats: PerformanceStats;
}

type Filter = 'all' | 'correct' | 'exact' | 'failed';

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

function getOutcome(r: PredictionRecord): 'exact' | 'correct' | 'failed' {
  const isExact = r.final.scoreA === r.actual.scoreA && r.final.scoreB === r.actual.scoreB;
  if (isExact) return 'exact';
  const predW = r.final.scoreA > r.final.scoreB ? 'A' : r.final.scoreA < r.final.scoreB ? 'B' : 'D';
  const actW  = r.actual.scoreA > r.actual.scoreB ? 'A' : r.actual.scoreA < r.actual.scoreB ? 'B' : 'D';
  return predW === actW ? 'correct' : 'failed';
}

function getPoints(outcome: 'exact' | 'correct' | 'failed'): number {
  return outcome === 'exact' ? 500 : outcome === 'correct' ? 150 : 0;
}

const TIERS = [
  { name: 'Rookie',          min: 0,     max: 500   },
  { name: 'Tactical Scout',  min: 500,   max: 2000  },
  { name: 'Analyst',         min: 2000,  max: 5000  },
  { name: 'Senior Analyst',  min: 5000,  max: 10000 },
  { name: 'Master Predictor',min: 10000, max: 15000 },
  { name: 'Legend',          min: 15000, max: 20000 },
];

export const PredictionsPage: React.FC<PredictionsPageProps> = ({ teams, stats }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const [records, setRecords] = useState<PredictionRecord[]>([]);

  React.useEffect(() => {
    loadRecords().then(r => setRecords(r.slice().reverse()));
  }, []);

  // records is newest-first already (reversed above)

  // Derived stats
  const totalPoints = records.reduce((s, r) => s + getPoints(getOutcome(r)), 0);
  const exactCount  = records.filter(r => getOutcome(r) === 'exact').length;

  const currentTier  = TIERS.findLast(t => totalPoints >= t.min) ?? TIERS[0];
  const nextTier     = TIERS[TIERS.indexOf(currentTier) + 1];
  const tierProgress = nextTier
    ? Math.round(((totalPoints - currentTier.min) / (nextTier.max - currentTier.min)) * 100)
    : 100;

  const filtered = records.filter(r => {
    const o = getOutcome(r);
    if (filter === 'all')     return true;
    if (filter === 'exact')   return o === 'exact';
    if (filter === 'correct') return o === 'exact' || o === 'correct';
    return o === 'failed';
  });

  const visible = filtered.slice(0, visibleCount);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'correct', label: 'Correct' },
    { key: 'exact',   label: 'Exact' },
    { key: 'failed',  label: 'Failed' },
  ];

  return (
    <div className="p-4 lg:p-10 space-y-6 lg:space-y-8 overflow-y-auto pb-24 lg:pb-8" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── BACKGROUND GLOW ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary-container rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tertiary-container rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
      </div>

      {/* ── MOBILE PROFILE SUMMARY CARD ─────────────────────────────────── */}
      <section className="lg:hidden bg-surface-container border border-outline-variant rounded-xl p-4 relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Active Rank</span>
            <h2 className="text-lg font-bold text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {currentTier.name}
            </h2>
          </div>
          <span
            className="material-symbols-outlined text-secondary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >military_tech</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant/30">
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Total Points</p>
            <p className="text-base font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {totalPoints.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant/30">
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Accuracy</p>
            <p className="text-base font-black text-tertiary" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {records.length ? Math.round(stats.accuracyRate) : 0}%
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-on-surface-variant">
            <span>Next: {nextTier?.name ?? 'Max Tier'}</span>
            <span>{totalPoints.toLocaleString()} / {(nextTier?.max ?? currentTier.max).toLocaleString()} PTS</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container rounded-full transition-all duration-700" style={{ width: `${tierProgress}%` }} />
          </div>
        </div>
      </section>

      {/* ── STATS BENTO + RANK (desktop only) ───────────────────────────── */}
      <section className="hidden lg:grid grid-cols-12 gap-4">

        {/* 4 stat cards */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-3 lg:gap-4">
          {/* Total Points */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant flex flex-col justify-between hover:border-primary transition-colors">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Points</span>
            <span className="text-3xl font-black text-primary mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {totalPoints.toLocaleString()}
            </span>
          </div>
          {/* Accuracy */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant flex flex-col justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Accuracy</span>
            <span className="text-3xl font-black text-tertiary mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {records.length ? Math.round(stats.accuracyRate) : 0}%
            </span>
          </div>
          {/* Exact Found */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant flex flex-col justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Exact Found</span>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-3xl font-black exact-gradient" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {exactCount}
              </span>
              <span className="material-symbols-outlined text-[#FFD700] text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                workspace_premium
              </span>
            </div>
          </div>
          {/* Resolved matches */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant flex flex-col justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Resolved</span>
            <span className="text-3xl font-black text-on-surface mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {records.length}
            </span>
          </div>
        </div>

        {/* Rank progress card */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-high p-6 rounded-xl border border-outline-variant relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Current Tier</p>
              <h3 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentTier.name}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[28px]">military_tech</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-on-surface font-medium">
                Next: {nextTier?.name ?? 'Max Tier'}
              </span>
              <span className="text-primary font-bold">
                {totalPoints.toLocaleString()} / {(nextTier?.max ?? currentTier.max).toLocaleString()} PTS
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-container rounded-full transition-all duration-700"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: 160 }}>stars</span>
          </div>
        </div>
      </section>

      {/* ── HISTORY LIST ─────────────────────────────────────────────────── */}
      <section className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden flex flex-col">

        {/* Filters bar */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-outline-variant bg-surface-container-low">
          {/* Mobile: horizontal scroll chips */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setVisibleCount(20); }}
                className={`shrink-0 px-4 lg:px-5 py-2 rounded-full text-xs lg:text-sm font-bold transition-colors ${
                  filter === f.key
                    ? 'bg-secondary text-on-secondary lg:bg-primary-container lg:text-primary'
                    : 'text-on-surface-variant bg-surface-container border border-outline-variant lg:border-0 lg:bg-transparent hover:bg-surface-variant'
                }`}
              >
                {f.label}
              </button>
            ))}
            {/* Desktop-only: count + export */}
            <div className="hidden lg:flex items-center gap-4 ml-auto shrink-0">
              <span className="text-sm text-on-surface-variant">{filtered.length} History Records</span>
              <div className="h-4 w-px bg-outline-variant" />
              <button className="flex items-center gap-1.5 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="history-scroll divide-y divide-outline-variant/30" style={{ overflowY: 'auto', maxHeight: 600 }}>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-[48px] opacity-40">history</span>
              <p className="text-sm font-medium">No prediction records yet.</p>
              <p className="text-xs opacity-60">Predict and resolve matches to build your history.</p>
            </div>
          ) : (
            visible.map((record, idx) => {
              const outcome  = getOutcome(record);
              const points   = getPoints(outcome);
              const tA = teams[record.teamAId];
              const tB = teams[record.teamBId];
              if (!tA || !tB) return null;

              const isExact   = outcome === 'exact';
              const isCorrect = outcome === 'correct';
              const resolvedDate = new Date(record.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

              const rowClass = isExact
                ? 'gold-glow bg-surface-container-high/40 m-3 rounded-lg'
                : isCorrect
                  ? 'border-l-4 border-tertiary'
                  : 'border-l-4 border-error/50 opacity-60';

              const predScore = `${record.final.scoreA} - ${record.final.scoreB}`;
              const actualScore = `${record.actual.scoreA} - ${record.actual.scoreB}`;

              const outcomeLabel = isExact
                ? { text: 'EXACT MATCH', color: 'text-[#FFD700]', icon: 'emoji_events' }
                : isCorrect
                  ? { text: 'WINNER PICKED', color: 'text-tertiary', icon: 'check_circle' }
                  : { text: 'FAILED', color: 'text-error', icon: 'cancel' };

              const predColor = isExact ? 'text-[#FFD700]' : isCorrect ? 'text-tertiary' : 'text-error';
              const ptsColor  = isExact ? 'text-[#FFD700]' : isCorrect ? 'text-tertiary' : 'text-on-surface-variant';

              const mobileBadgeClass = isExact
                ? 'bg-[#FFD700]/20 text-[#FFD700]'
                : isCorrect
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'bg-error/20 text-error';
              const mobileBadgeText = isExact ? 'Exact Score' : isCorrect ? 'Winner Pick' : 'Failed';

              return (
                <div
                  key={`${record.matchId}-${idx}`}
                  className={`hover:bg-surface-variant/20 transition-all ${rowClass}`}
                >
                  {/* ── MOBILE LAYOUT ────────────────────────── */}
                  <div className={`lg:hidden flex items-center gap-3 p-3 ${isExact ? '' : ''}`}>
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Top row: stage + badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                          {record.stage} • {resolvedDate}
                        </span>
                        <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase rounded tracking-tight ${mobileBadgeClass}`}>
                          {mobileBadgeText}
                        </span>
                      </div>
                      {/* Middle row: team A | score | team B */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center gap-0.5 w-10">
                          <img
                            src={getFlagUrl(tA.id)} alt={tA.id}
                            className={`w-8 h-6 object-cover rounded-sm border border-outline-variant ${!isCorrect && !isExact ? 'grayscale' : ''}`}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="text-[8px] font-bold text-on-surface uppercase">{tA.id}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              {record.actual.scoreA}
                            </span>
                            <span className="text-on-surface-variant font-bold">-</span>
                            <span className="text-lg font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              {record.actual.scoreB}
                            </span>
                          </div>
                          <span className={`text-[8px] font-bold ${predColor}`}>
                            Predicted: {record.final.scoreA}-{record.final.scoreB}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 w-10">
                          <img
                            src={getFlagUrl(tB.id)} alt={tB.id}
                            className={`w-8 h-6 object-cover rounded-sm border border-outline-variant ${!isCorrect && !isExact ? 'grayscale' : ''}`}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="text-[8px] font-bold text-on-surface uppercase">{tB.id}</span>
                        </div>
                      </div>
                    </div>
                    {/* Points */}
                    <div className="w-12 shrink-0 flex flex-col items-center justify-center border-l border-outline-variant pl-3">
                      <span className={`text-sm font-black ${ptsColor}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {points > 0 ? `+${points}` : '0'}
                      </span>
                      <span className="text-[8px] text-on-surface-variant uppercase font-bold">PTS</span>
                    </div>
                  </div>

                  {/* ── DESKTOP LAYOUT ───────────────────────── */}
                  <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">

                    {/* Teams + actual score */}
                    <div className="flex items-center gap-8 md:w-1/3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden">
                          <img
                            src={getFlagUrl(tA.id)} alt={tA.name}
                            className={`w-full h-full object-cover ${!isCorrect && !isExact ? 'grayscale' : ''}`}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">{tA.id}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl font-black text-on-surface" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {actualScore}
                        </span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">FINAL</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden">
                          <img
                            src={getFlagUrl(tB.id)} alt={tB.name}
                            className={`w-full h-full object-cover ${!isCorrect && !isExact ? 'grayscale' : ''}`}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">{tB.id}</span>
                      </div>
                    </div>

                    {/* Prediction + outcome */}
                    <div className="flex flex-col items-center justify-center flex-1 border-x border-outline-variant/30 px-6">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        YOUR PREDICTION
                      </span>
                      <div className="flex items-center gap-4">
                        <span className={`text-xl font-bold ${predColor}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {predScore}
                        </span>
                        <div className="flex flex-col items-start">
                          <span className={`font-bold text-xs flex items-center gap-1 uppercase tracking-wider ${outcomeLabel.color}`}>
                            <span
                              className="material-symbols-outlined text-[16px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {outcomeLabel.icon}
                            </span>
                            {outcomeLabel.text}
                          </span>
                          <span className="text-[10px] text-on-surface mt-0.5">
                            {record.stage} • {resolvedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="md:w-1/4 flex flex-col items-end">
                      <span className={`text-xl font-black ${ptsColor}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {points > 0 ? `+${points} PTS` : '0 PTS'}
                      </span>
                      <span className="text-sm text-on-surface-variant mt-0.5">
                        {isExact ? 'Exact Score' : isCorrect ? 'Correct Outcome' : 'Wrong Outcome'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {visibleCount < filtered.length && (
          <div className="p-6 flex justify-center border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => setVisibleCount(v => v + 20)}
              className="flex items-center gap-2 px-8 py-3 bg-surface-variant hover:bg-surface-bright text-on-surface font-bold rounded-xl transition-colors"
            >
              Load More Prediction History
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        )}

        {/* Empty footer when no more to load */}
        {filtered.length > 0 && visibleCount >= filtered.length && (
          <div className="p-4 text-center border-t border-outline-variant bg-surface-container-low">
            <span className="text-xs text-on-surface-variant">All {filtered.length} records shown</span>
          </div>
        )}
      </section>
    </div>
  );
};
