import type { Game } from '../types/game';

export function calculateGamePoints(game: Game): { USA: number, EUROPE: number } {
  if (!game.isStarted) return { USA: 0, EUROPE: 0 };
  
  const points = {
    USA: 0,
    EUROPE: 0
  };

  // For completed games, use final scores
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
  // For in-progress games, calculate current points
  else if (game.isStarted) {
    // Stroke play point (based on current scores)
    if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
      points.USA += 1;
    } else if (game.strokePlayScore.USA > game.strokePlayScore.EUROPE) {
      points.EUROPE += 1;
    } else if (game.strokePlayScore.USA > 0 || game.strokePlayScore.EUROPE > 0) {
      points.USA += 0.5;
      points.EUROPE += 0.5;
    }

    // Match play point (based on current holes won)
    if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
      points.USA += 1;
    } else if (game.matchPlayScore.USA < game.matchPlayScore.EUROPE) {
      points.EUROPE += 1;
    } else if (game.matchPlayScore.USA > 0 || game.matchPlayScore.EUROPE > 0) {
      points.USA += 0.5;
      points.EUROPE += 0.5;
    }
  }

  return points;
}