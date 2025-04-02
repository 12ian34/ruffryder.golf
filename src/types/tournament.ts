export interface TournamentProgress {
  timestamp: any; // Firestore Timestamp
  score: {
    raw: {
      USA: number;
      EUROPE: number;
    };
    adjusted: {
      USA: number;
      EUROPE: number;
    };
  };
  completedGames: number;
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  useHandicaps: boolean;
  totalScore: {
    raw: {
      USA: number;
      EUROPE: number;
    };
    adjusted: {
      USA: number;
      EUROPE: number;
    };
  };
  projectedScore: {
    raw: {
      USA: number;
      EUROPE: number;
    };
    adjusted: {
      USA: number;
      EUROPE: number;
    };
  };
  progress: TournamentProgress[];
}