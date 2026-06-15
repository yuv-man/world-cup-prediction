import React, { useEffect, useRef, useState } from 'react';
import type { AgentDebateMessage, AgentState } from '../types';
import { Terminal } from 'lucide-react';

interface AgentTerminalProps {
  logs: AgentDebateMessage[];
  agents: AgentState[];
  onClearLogs: () => void;
}

interface CommandHistory {
  command: string;
  response: string[];
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ logs, agents, onClearLogs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);

  useEffect(() => {
    if (logs.length === 0 && commandHistory.length === 0) return;
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs, commandHistory]);

  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    if (activeFilter === 'all') return true;
    return log.agentId === activeFilter;
  });

  const getLogStyle = (agentId: string) => {
    switch (agentId) {
      case 'injury':
        return 'text-red-400';
      case 'standings':
        return 'text-blue-400';
      case 'sentiment':
        return 'text-purple-400';
      case 'decision':
        return 'text-emerald-400 font-semibold';
      case 'learning':
        return 'text-amber-400';
      default:
        return 'text-slate-300';
    }
  };

  const getAgentTag = (agentId: string) => {
    switch (agentId) {
      case 'injury':
        return '[INJURY_AGNT]';
      case 'standings':
        return '[FORM_AGNT]';
      case 'sentiment':
        return '[CROWD_AGNT]';
      case 'decision':
        return '[DECISION_OP]';
      case 'learning':
        return '[LEARN_AGNT]';
      default:
        return '[SYS]';
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    let response: string[] = [];

    switch (cmd) {
      case 'help':
        response = [
          'Available Commands:',
          '  help     - Show this developer command guide',
          '  status   - View current status of all neural agents',
          '  weights  - Inspect current predictive weight profiles',
          '  clear    - Flush developer console logs',
          '  system   - Details about the World Cup Predictor agent grid'
        ];
        break;
      case 'status':
        response = [
          'AGENT GRID STATUS STATUS:',
          ...agents.map(a => `  - ${a.name}: ${a.status.toUpperCase()} (Core: ${a.coreMetric})`)
        ];
        break;
      case 'weights':
        response = [
          'CURRENT PREDICTIVE WEIGHTS:',
          ...agents.map(a => `  - ${a.name}: ${Math.round(a.weight * 100)}%`)
        ];
        break;
      case 'clear':
        setCommandHistory([]);
        onClearLogs();
        setCommandInput('');
        return;
      case 'system':
        response = [
          'Multi-Agent System v3.0.0 — Gemini Edition',
          'AI Brain: Google Gemini 2.5 Flash (gemini-2.5-flash)',
          'Architecture: 3 Parallel Gemini Specialists → Decision Agent consensus',
          'Agents: Injury Analyst, Form & ELO, Tournament Context + Learning Loop',
          'State: LocalStorage persistent sync active'
        ];
        break;
      default:
        response = [`Command not found: "${cmd}". Type "help" for a list of commands.`];
    }

    setCommandHistory(prev => [...prev, { command: commandInput, response }]);
    setCommandInput('');
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Multi-Agent Debate Terminal
        </h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          {['all', 'injury', 'standings', 'sentiment', 'decision', 'learning'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Screen */}
      <div className="terminal-window flex-1 flex flex-col min-h-[380px]">
        {/* Top bar */}
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="terminal-dot dot-red" />
            <span className="terminal-dot dot-yellow" />
            <span className="terminal-dot dot-green" />
          </div>
          <span className="terminal-title">agent_debate_console.sh</span>
          <span className="text-[10px] text-slate-500 font-mono">active_threads: 5</span>
        </div>

        {/* Scrollable logs */}
        <div className="terminal-body flex-1 overflow-y-auto font-mono text-[12px] p-4 flex flex-col gap-2 bg-[#020617]">
          {/* Welcome Message */}
          <div className="text-slate-500 border-b border-slate-900/60 pb-2 mb-2">
            Gemini-powered Multi-Agent System ready. 48 teams · 12 groups loaded. Type "help" for commands.
          </div>

          {/* Core Agent logs */}
          {filteredLogs.map((log, index) => (
            <div key={`log-${index}`} className="flex flex-col gap-0.5 leading-relaxed">
              <span className="text-[10px] text-slate-600">
                [{log.timestamp}]
              </span>
              <p className={getLogStyle(log.agentId)}>
                <span className="opacity-80 mr-1.5 font-bold">
                  {getAgentTag(log.agentId)}
                </span>
                {log.message}
              </p>
            </div>
          ))}

          {/* Interactive Command History */}
          {commandHistory.map((h, i) => (
            <div key={`cmd-${i}`} className="flex flex-col gap-1 mt-2">
              <div className="text-indigo-400 flex items-center gap-1.5">
                <span className="text-slate-600 font-bold">&gt;</span>
                <span>{h.command}</span>
              </div>
              {h.response.map((line, li) => (
                <div key={`line-${li}`} className="text-slate-400 pl-4 whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>
          ))}

          <div ref={terminalEndRef} />
        </div>

        {/* Command Form */}
        <form onSubmit={handleCommandSubmit} className="flex border-t border-slate-900 bg-slate-950 p-2 items-center gap-2 font-mono text-xs">
          <span className="text-indigo-500 pl-2 font-bold">&gt;</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder='Type "help" or run diagnostic commands...'
            className="flex-1 bg-transparent border-none outline-none text-slate-200 focus:ring-0 placeholder:text-slate-700"
          />
          <button type="submit" className="text-indigo-400 hover:text-indigo-300 pr-2">
            Execute
          </button>
        </form>
      </div>
    </div>
  );
};
