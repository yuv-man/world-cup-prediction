export interface EloMatch {
  date: string;           // YYYY-MM-DD
  opponent: string;       // opponent's elo code
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
  matchType: string;      // WC, F, EC, etc.
  eloAfter: number;
  eloChange: number;
}

export interface EloData {
  eloRating: number;
  eloRank: number;
  last10GoalsFor: number;
  last10GoalsAgainst: number;
  lastMatch: { date: string; opponent: string; result: string; type: string } | null;
  recentMatches: EloMatch[];
}

export interface Injury {
  playerName: string;
  severity: 'low' | 'medium' | 'high'; // low: minor, medium: doubtful, high: out
  description: string;
}

export interface Team {
  id: string; // e.g. "ARG"
  name: string;
  emoji: string;
  fifaRank: number;
  group: string;
  stats: {
    attack: number;    // 50-99
    defense: number;   // 50-99
    midfield: number;  // 50-99
  };
  recentForm: ('W' | 'D' | 'L')[]; // Last 5 matches, e.g. ['W', 'W', 'L', 'W', 'D']
  starPlayers: string[];
  injuries: Injury[];
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  date: string;
  stage: string; // "Group Stage", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
  status: 'upcoming' | 'predicted' | 'approved' | 'completed';
  predictedScoreA?: number;
  predictedScoreB?: number;
  approvedScoreA?: number;
  approvedScoreB?: number;
  actualScoreA?: number;
  actualScoreB?: number;
  confidence?: number;
}

export type AgentType = 'injury' | 'standings' | 'sentiment' | 'decision' | 'learning';

export interface AgentState {
  id: AgentType;
  name: string;
  weight: number;
  avatar: string;
  description: string;
  coreMetric: string;
  status: 'idle' | 'scraping' | 'analyzing' | 'done' | 'learning';
}

export interface AgentPrediction {
  scoreA: number;
  scoreB: number;
  confidence: number;
  reasoning: string[];
}

export interface AgentDebateMessage {
  agentId: AgentType;
  agentName: string;
  message: string;
  timestamp: string;
  type: 'info' | 'data' | 'opinion' | 'consensus' | 'system';
}

export interface MatchPredictionState {
  matchId: string;
  agentPredictions: Record<string, AgentPrediction>; // key is agentId (injury, standings, sentiment)
  finalPrediction: AgentPrediction;
  debateLogs: AgentDebateMessage[];
}

export interface WeightHistoryPoint {
  timestamp: string;
  matchId: string;
  matchName: string;
  injuryWeight: number;
  standingsWeight: number;
  sentimentWeight: number;
}

export interface AgentCallRecord {
  scoreA: number;
  scoreB: number;
  confidence: number;
  correctOutcome: boolean;
  goalError: number; // mean absolute error in goals
}

/** Persisted after every resolved match. Powers cumulative agent learning. */
export interface PredictionRecord {
  matchId: string;
  teamAId: string;
  teamBId: string;
  stage: string;
  resolvedAt: string;        // ISO timestamp
  agents: {
    injury: AgentCallRecord;
    standings: AgentCallRecord;
    sentiment: AgentCallRecord;
  };
  final: {
    scoreA: number;
    scoreB: number;
    confidence: number;
  };
  actual: {
    scoreA: number;
    scoreB: number;
  };
  weightsUsed: { injury: number; standings: number; sentiment: number };
  eloRatingA?: number;
  eloRatingB?: number;
}

export interface PerformanceStats {
  totalPredicted: number;
  totalCompleted: number;
  correctOutcomes: number; // Correct winner or draw
  exactScores: number; // Correct exact score
  avgError: number; // Mean absolute error in goals
  accuracyRate: number; // percentage of correct outcomes
}
