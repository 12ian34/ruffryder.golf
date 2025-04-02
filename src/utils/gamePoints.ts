import type { Game } from '../types/game';

export function calculateGamePoints(game: Game): { 
  raw: { USA: number, EUROPE: number },
  adjusted: { USA: number, EUROPE: number }
} {
  if (!game.isStarted) return { 
    raw: { USA: 0, EUROPE: 0 },
    adjusted: { USA: 0, EUROPE: 0 }
  };
  
  const points = {
    raw: { USA: 0, EUROPE: 0 },
    adjusted: { USA: 0, EUROPE: 0 }
  };

  // Calculate stroke play points
  if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
    points.raw.USA += 1;
  } else if (game.strokePlayScore.USA > game.strokePlayScore.EUROPE) {
    points.raw.EUROPE += 1;
  } else if (game.strokePlayScore.USA === game.strokePlayScore.EUROPE) {
    points.raw.USA += 0.5;
    points.raw.EUROPE += 0.5;
  }

  if (game.strokePlayScore.adjustedUSA < game.strokePlayScore.adjustedEUROPE) {
    points.adjusted.USA += 1;
  } else if (game.strokePlayScore.adjustedUSA > game.strokePlayScore.adjustedEUROPE) {
    points.adjusted.EUROPE += 1;
  } else if (game.strokePlayScore.adjustedUSA === game.strokePlayScore.adjustedEUROPE) {
    points.adjusted.USA += 0.5;
    points.adjusted.EUROPE += 0.5;
  }

  // Calculate match play points
  if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
    points.raw.USA += 1;
  } else if (game.matchPlayScore.USA < game.matchPlayScore.EUROPE) {
    points.raw.EUROPE += 1;
  } else if (game.matchPlayScore.USA === game.matchPlayScore.EUROPE) {
    points.raw.USA += 0.5;
    points.raw.EUROPE += 0.5;
  }

  if (game.matchPlayScore.adjustedUSA > game.matchPlayScore.adjustedEUROPE) {
    points.adjusted.USA += 1;
  } else if (game.matchPlayScore.adjustedUSA < game.matchPlayScore.adjustedEUROPE) {
    points.adjusted.EUROPE += 1;
  } else if (game.matchPlayScore.adjustedUSA === game.matchPlayScore.adjustedEUROPE) {
    points.adjusted.USA += 0.5;
    points.adjusted.EUROPE += 0.5;
  }

  return points;
}