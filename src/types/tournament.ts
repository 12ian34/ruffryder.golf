export interface TournamentProgress {
  timestamp: any; // Firestore Timestamp
  score: {
    USA: number;
    EUROPE: number;
  };
  completedGames: number;
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  totalScore: {
    USA: number;
    EUROPE: number;
  };
  projectedScore: {
    USA: number;
    EUROPE: number;
  };
  progress: TournamentProgress[];
}