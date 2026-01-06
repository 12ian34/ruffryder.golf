import type { Game } from '../types/game';
import type { Player } from '../types/player';

interface HandicapAdjustedScores {
  usaAdjustedScore: number | null;
  europeAdjustedScore: number | null;
  usaMatchPlayScore: number;
  europeMatchPlayScore: number;
  usaMatchPlayAdjustedScore: number;
  europeMatchPlayAdjustedScore: number;
}

export function calculateHandicapAdjustedScores(
  game: Game,
  hole: { strokeIndex: number },
  scores: { usaScore: number | null, europeScore: number | null }
): HandicapAdjustedScores {
  const result = {
    usaAdjustedScore: scores.usaScore,
    europeAdjustedScore: scores.europeScore,
    usaMatchPlayScore: 0,
    europeMatchPlayScore: 0,
    usaMatchPlayAdjustedScore: 0,
    europeMatchPlayAdjustedScore: 0
  };

  if (scores.usaScore === null || scores.europeScore === null) {
    return result;
  }

  // Calculate how many complete 18-hole cycles of strokes to apply
  const fullCycles = Math.floor(game.handicapStrokes / 18);
  
  // Calculate remaining strokes after full cycles
  const remainingStrokes = game.handicapStrokes % 18;
  
  // Apply a stroke for each full cycle
  // Plus an additional stroke if this hole's index is low enough for remaining strokes
  const strokesForHole = fullCycles + (hole.strokeIndex <= remainingStrokes ? 1 : 0);

  // Apply strokes based on which team gets them
  if (game.higherHandicapTeam === 'USA') {
    result.usaAdjustedScore = scores.usaScore;
    result.europeAdjustedScore = scores.europeScore + strokesForHole;
  } else {
    result.usaAdjustedScore = scores.usaScore + strokesForHole;
    result.europeAdjustedScore = scores.europeScore;
  }

  // Calculate raw match play scores
  if (scores.usaScore < scores.europeScore) {
    result.usaMatchPlayScore = 1;
    result.europeMatchPlayScore = 0;
  } else if (scores.europeScore < scores.usaScore) {
    result.usaMatchPlayScore = 0;
    result.europeMatchPlayScore = 1;
  }

  // Calculate adjusted match play scores
  if (result.usaAdjustedScore < result.europeAdjustedScore) {
    result.usaMatchPlayAdjustedScore = 1;
    result.europeMatchPlayAdjustedScore = 0;
  } else if (result.europeAdjustedScore < result.usaAdjustedScore) {
    result.usaMatchPlayAdjustedScore = 0;
    result.europeMatchPlayAdjustedScore = 1;
  } else {
    result.usaMatchPlayAdjustedScore = 0;
    result.europeMatchPlayAdjustedScore = 0;
  }

  return result;
}

// New interface for the return type
export interface TeamAverageHandicaps {
  usaAverage: number;
  europeAverage: number;
}

/**
 * Calculates the average handicap for Team USA and Team Europe from a list of players.
 * Players without a valid numeric averageScore are excluded from the calculation.
 * Averages are rounded to one decimal place.
 * If no players are found for a team, their average handicap will be 0.
 *
 * @param players - An array of Player objects.
 * @returns An object containing the average handicap for Team USA and Team Europe.
 */
export function calculateAverageTeamHandicaps(players: Player[]): TeamAverageHandicaps {
  const usaPlayers = players.filter(
    p => p.team === 'USA' && typeof p.averageScore === 'number' && !isNaN(p.averageScore)
  );
  const europePlayers = players.filter(
    p => p.team === 'EUROPE' && typeof p.averageScore === 'number' && !isNaN(p.averageScore)
  );

  const usaTotalHandicap = usaPlayers.reduce((sum, p) => sum + (p.averageScore ?? 0), 0);
  const europeTotalHandicap = europePlayers.reduce((sum, p) => sum + (p.averageScore ?? 0), 0);

  const usaAverage = usaPlayers.length > 0 ? usaTotalHandicap / usaPlayers.length : 0;
  const europeAverage = europePlayers.length > 0 ? europeTotalHandicap / europePlayers.length : 0;

  return {
    usaAverage: parseFloat(usaAverage.toFixed(1)),
    europeAverage: parseFloat(europeAverage.toFixed(1)),
  };
} 