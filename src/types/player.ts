export interface HistoricalScore {
  year: number;
  score: number;
}

export interface Player {
  id: string;
  name: string;
  team: 'USA' | 'EUROPE';
  tier?: number;
  historicalScores: HistoricalScore[];
  averageScore?: number;
  customEmoji?: string;
}