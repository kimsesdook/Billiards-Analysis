export type GameType = '3-Cushion' | '4-Ball';
export type GameMode = 'Individual' | 'Team';

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
  trend: '상승세' | '하락세' | '유지';
  changeRate: number;
}
