import React from 'react';
import type { PerformanceStats, WeightHistoryPoint } from '../types';
import { TrendingUp } from 'lucide-react';

interface StatsOverviewProps {
  stats: PerformanceStats;
  weightHistory: WeightHistoryPoint[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, weightHistory }) => {
  const renderChart = () => {
    if (weightHistory.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-40 border border-dashed border-outline-variant rounded-xl bg-surface-container/40 text-on-surface-variant p-4 text-center">
          <TrendingUp className="w-7 h-7 mb-2 opacity-40" />
          <span className="text-xs font-semibold">Weight Evolution Graph</span>
          <span className="text-[10px] mt-1 opacity-60">Predict and resolve at least 2 matches to view calibration charts.</span>
        </div>
      );
    }
    const W = 450, H = 140, PAD = 24;
    const cW = W - PAD * 2, cH = H - PAD * 2;
    const n = weightHistory.length;
    const x = (i: number) => n <= 1 ? PAD + cW / 2 : PAD + (i / (n - 1)) * cW;
    const y = (v: number) => PAD + cH - v * cH;
    let iP = '', sP = '', seP = '';
    weightHistory.forEach((pt, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      iP += ` ${cmd} ${x(i)} ${y(pt.injuryWeight)}`;
      sP += ` ${cmd} ${x(i)} ${y(pt.standingsWeight)}`;
      seP += ` ${cmd} ${x(i)} ${y(pt.sentimentWeight)}`;
    });
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          <span>Agent Weight Evolution</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" /> Injury</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Form</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary inline-block" /> Sentiment</span>
          </div>
        </div>
        <div className="bg-surface-container/40 p-2 rounded-xl border border-outline-variant overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[300px]">
            {[0, 0.25, 0.5, 0.75, 1.0].map((lvl, i) => (
              <g key={i}>
                <line x1={PAD} y1={y(lvl)} x2={W - PAD} y2={y(lvl)} stroke="rgba(144,144,151,0.15)" strokeWidth="1" />
                <text x={PAD - 4} y={y(lvl) + 3} fill="#909097" fontSize="7" textAnchor="end">{Math.round(lvl * 100)}%</text>
              </g>
            ))}
            <path d={iP} fill="none" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={sP} fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={seP} fill="none" stroke="var(--color-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {weightHistory.map((pt, i) => (
              <g key={i}>
                <circle cx={x(i)} cy={y(pt.injuryWeight)} r="3" fill="var(--color-error)" />
                <circle cx={x(i)} cy={y(pt.standingsWeight)} r="3" fill="var(--color-secondary)" />
                <circle cx={x(i)} cy={y(pt.sentimentWeight)} r="3" fill="var(--color-tertiary)" />
                <text x={x(i)} y={H - PAD + 12} fill="#909097" fontSize="6" textAnchor="middle">{pt.matchName}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const statCards = [
    { label: 'Hit Rate', value: `${Math.round(stats.accuracyRate)}%`, color: 'text-tertiary', bg: 'bg-tertiary/10' },
    { label: 'Exact Scores', value: stats.exactScores, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10' },
    { label: 'Avg Goal Error', value: stats.avgError.toFixed(2), color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Resolved', value: stats.totalCompleted, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="bg-surface-container-high rounded-xl border border-outline-variant p-6 flex flex-col gap-5">
      <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 uppercase tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        🏆 Prediction Analytics
      </h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {statCards.map(sc => (
          <div key={sc.label} className={`${sc.bg} rounded-xl p-4 flex flex-col gap-1.5 border border-outline-variant`}>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{sc.label}</span>
            <span className={`text-2xl font-black ${sc.color}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>{sc.value}</span>
          </div>
        ))}
      </div>
      {renderChart()}
    </div>
  );
};
