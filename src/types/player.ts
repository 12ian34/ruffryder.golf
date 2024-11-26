export interface HistoricalScore {
  year: number;
  score: number;
}

export interface Player {
  id: string;
  name: string;
  team: 'USA' | 'EUROPE';
  historicalScores: HistoricalScore[];
  averageScore: number;
  profilePicUrl?: string;
}