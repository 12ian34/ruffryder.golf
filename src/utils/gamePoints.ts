import type { Game } from '../types/game';

export function calculateGamePoints(game: Game): { USA: number, EUROPE: number } {
  if (!game.isStarted) return { USA: 0, EUROPE: 0 };
  
  const points = {
    USA: 0,
    EUROPE: 0
  };

  if (game.isComplete) {
    // Stroke play point
    if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
      points.USA += 1;
    } else if (game.strokePlayScore.USA > game.strokePlayScore.EUROPE) {
      points.EUROPE += 1;
    } else {
      points.USA += 0.5;
      points.EUROPE += 0.5;
    }

    // Match play point
    if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
      points.USA += 1;
    } else if (game.matchPlayScore.USA < game.matchPlayScore.EUROPE) {
      points.EUROPE += 1;
    } else {
      points.USA += 0.5;
      points.EUROPE += 0.5;
    }
  }

  return points;
}