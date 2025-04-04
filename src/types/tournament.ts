export type TeamConfig = 'USA_VS_EUROPE' | 'EUROPE_VS_EUROPE' | 'USA_VS_USA';

export interface Matchup {
  id: string;
  usaPlayerId: string;
  europePlayerId: string;
  usaPlayerName: string;
  europePlayerName: string;
  status: 'pending' | 'in_progress' | 'completed';
  handicapStrokes?: number;
}

export interface TournamentProgress {
  date: string;
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
}

export interface TournamentProgressDisplay {
  timestamp: Date;
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
  useHandicaps: boolean;
  teamConfig: TeamConfig;
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
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
  matchups: Matchup[];
  createdAt: string;
  updatedAt: string;
}