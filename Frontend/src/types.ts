export type GameType = '3-Cushion' | '4-Ball';
export type GameMode = 'Individual' | 'Team';
export type GameTrend = 'RISING' | 'FALLING' | 'STABLE';

export interface GameRecord {
  id: string;
  date: string;
  type: GameType;
  mode: GameMode;
  myScore: number;
  opponentScore: number;
  innings: number;
  highRun: number;
  average: number;
  win: boolean;
  playerCount: 2 | 3 | 4;
  rank?: number; // For 3 or 4 players
  lastThreeCushions?: 0 | 1 | 2; // For 4-Ball
  notes?: string;
  opponentName?: string;
  inningScores?: number[]; // Added to store points scored in each inning
  myCushionScore?: number;
  opponentCushionScore?: number;
}

export type GameRecordDraft = Omit<GameRecord, 'id' | 'average' | 'win' | 'mode'> & {
  mode?: GameMode;
};

export interface GameRecordSearchParams {
  type?: GameType;
  mode?: GameMode;
  playerCount?: 2 | 3 | 4;
  keyword?: string;
  page: number;
  size: number;
}

export interface GameRecordPage {
  content: GameRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface OpponentStatistics {
  opponentName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  overallAverage: number;
  bestAverage: number;
  maxHighRun: number;
  totalInnings: number;
  totalMyScore: number;
  totalOpponentScore: number;
  lastPlayedAt: string;
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  overallAverage: number;
  bestAverage: number;
  maxHighRun: number;
  totalInnings: number;
  totalPoints: number;
  calculatedDama: number;
  trend: GameTrend;
  changeRate: number;
}

export interface GameAverageTrend {
  gameRecordId: string;
  playedAt: string;
  average: number;
  highRun: number;
  win: boolean;
}

export interface GameStatistics extends PlayerStats {
  type: GameType;
  recentAverageTrends: GameAverageTrend[];
}

export interface WeeklyGameSummary {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  overallAverage: number;
  maxHighRun: number;
  totalInnings: number;
  totalPoints: number;
}

export interface WeeklyGameReportComparison {
  hasPreviousWeekData: boolean;
  gameCountChange: number;
  winRateChange: number;
  overallAverageChange: number;
  overallAverageChangeRate: number;
  highRunChange: number;
  trend: GameTrend;
}

export interface WeeklyGameReport {
  type: GameType | null;
  currentWeekStartDate: string;
  currentWeekEndDate: string;
  previousWeekStartDate: string;
  previousWeekEndDate: string;
  currentWeek: WeeklyGameSummary;
  previousWeek: WeeklyGameSummary;
  comparison: WeeklyGameReportComparison;
}
