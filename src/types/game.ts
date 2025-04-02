export type GameStatus = 'all' | 'complete' | 'in_progress' | 'not_started';

export interface HoleScore {
  holeNumber: number;
  strokeIndex: number;
  parScore: number;
  usaPlayerScore?: number;
  europePlayerScore?: number;
  usaPlayerAdjustedScore?: number;
  europePlayerAdjustedScore?: number;
  usaPlayerMatchPlayScore?: number;  // 1 for win, 0.5 for halve, 0 for loss (raw)
  europePlayerMatchPlayScore?: number;  // 1 for win, 0.5 for halve, 0 for loss (raw)
  usaPlayerMatchPlayAdjustedScore?: number;  // 1 for win, 0.5 for halve, 0 for loss (adjusted)
  europePlayerMatchPlayAdjustedScore?: number;  // 1 for win, 0.5 for halve, 0 for loss (adjusted)
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
  isComplete: boolean;
  isStarted: boolean;
  startTime?: Date;
  endTime?: Date;
  playerIds: string[];
  useHandicaps: boolean;
}