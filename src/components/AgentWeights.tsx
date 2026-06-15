import React from 'react';
import type { AgentState, AgentType } from '../types';

interface AgentWeightsProps {
  agents: AgentState[];
  onWeightChange: (agentId: AgentType, newWeight: number) => void;
  onResetWeights: () => void;
}

const AGENT_COLORS: Record<string, string> = {
  injury: 'bg-error/10 text-error',
  standings: 'bg-secondary/10 text-secondary',
  sentiment: 'bg-tertiary/10 text-tertiary',
};

export const AgentWeights: React.FC<AgentWeightsProps> = ({ agents, onWeightChange, onResetWeights }) => {
  const getStatusDot = (status: AgentState['status']) => {
    if (status === 'scraping' || status === 'analyzing') return 'bg-secondary animate-pulse';
    if (status === 'done') return 'bg-tertiary';
    if (status === 'learning') return 'bg-error animate-pulse';
    return 'bg-outline';
  };

  const coreAgents = agents.filter(a => ['injury', 'standings', 'sentiment'].includes(a.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Agent Weights</p>
        <button onClick={onResetWeights} className="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">Reset</button>
      </div>
      {coreAgents.map(agent => (
        <div key={agent.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${getStatusDot(agent.status)}`} />
              <span className="text-[11px] font-medium text-on-surface">{agent.avatar} {agent.name.split(' ')[0]}</span>
            </div>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${AGENT_COLORS[agent.id] ?? ''}`}>
              {Math.round(agent.weight * 100)}%
            </span>
          </div>
          <input
            type="range" min="5" max="90"
            value={Math.round(agent.weight * 100)}
            onChange={e => onWeightChange(agent.id as AgentType, parseInt(e.target.value) / 100)}
            disabled={agent.status !== 'idle' && agent.status !== 'done'}
            className="slider-custom"
          />
        </div>
      ))}
    </div>
  );
};
