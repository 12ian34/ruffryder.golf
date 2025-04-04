export type GameStatus = 'not_started' | 'in_progress' | 'complete' | 'all';

export interface HoleScore {
  holeNumber: number;
  strokeIndex: number;
  parScore: number;
  usaPlayerScore: number | null;
  europePlayerScore: number | null;
  usaPlayerAdjustedScore: number | null;
  europePlayerAdjustedScore: number | null;
  usaPlayerMatchPlayScore: number;
  europePlayerMatchPlayScore: number;
  usaPlayerMatchPlayAdjustedScore: number;
  europePlayerMatchPlayAdjustedScore: number;
}

export interface Game {
  id: string;
  tournamentId: string;
  usaPlayerId: string;
  usaPlayerName: string;
  usaPlayerProfilePic?: string;
  usaPlayerHandicap?: number;
  europePlayerId: string;
  europePlayerName: string;
  europePlayerProfilePic?: string;
  europePlayerHandicap?: number;
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
  holes: HoleScore[];
  strokePlayScore: {
    USA: number;
    EUROPE: number;
    adjustedUSA: number;
    adjustedEUROPE: number;
  };
  matchPlayScore: {
    USA: number;
    EUROPE: number;
    adjustedUSA: number;
    adjustedEUROPE: number;
  };
  points: {
    raw: {
      USA: number;
      EUROPE: number;
    };
    adjusted: {
      USA: number;
      EUROPE: number;
    };
  };
  isComplete: boolean;
  isStarted: boolean;
  startTime?: Date;
  endTime?: Date;
  playerIds: string[];
  useHandicaps?: boolean;
  status: GameStatus;
  updatedAt?: any;
}

export interface TournamentSettings {
  id: string;
  useHandicaps: boolean;
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
}