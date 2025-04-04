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

  // Safely get score values with fallbacks to 0
  const strokePlayUSA = game.strokePlayScore?.USA ?? 0;
  const strokePlayEUROPE = game.strokePlayScore?.EUROPE ?? 0;
  const strokePlayAdjustedUSA = game.strokePlayScore?.adjustedUSA ?? 0;
  const strokePlayAdjustedEUROPE = game.strokePlayScore?.adjustedEUROPE ?? 0;
  const matchPlayUSA = game.matchPlayScore?.USA ?? 0;
  const matchPlayEUROPE = game.matchPlayScore?.EUROPE ?? 0;
  const matchPlayAdjustedUSA = game.matchPlayScore?.adjustedUSA ?? 0;
  const matchPlayAdjustedEUROPE = game.matchPlayScore?.adjustedEUROPE ?? 0;

  // Calculate stroke play points
  if (strokePlayUSA < strokePlayEUROPE) {
    points.raw.USA += 1;
  } else if (strokePlayUSA > strokePlayEUROPE) {
    points.raw.EUROPE += 1;
  } else if (strokePlayUSA === strokePlayEUROPE) {
    points.raw.USA += 0.5;
    points.raw.EUROPE += 0.5;
  }

  if (strokePlayAdjustedUSA < strokePlayAdjustedEUROPE) {
    points.adjusted.USA += 1;
  } else if (strokePlayAdjustedUSA > strokePlayAdjustedEUROPE) {
    points.adjusted.EUROPE += 1;
  } else if (strokePlayAdjustedUSA === strokePlayAdjustedEUROPE) {
    points.adjusted.USA += 0.5;
    points.adjusted.EUROPE += 0.5;
  }

  // Calculate match play points
  if (matchPlayUSA > matchPlayEUROPE) {
    points.raw.USA += 1;
  } else if (matchPlayUSA < matchPlayEUROPE) {
    points.raw.EUROPE += 1;
  } else if (matchPlayUSA === matchPlayEUROPE) {
    points.raw.USA += 0.5;
    points.raw.EUROPE += 0.5;
  }

  if (matchPlayAdjustedUSA > matchPlayAdjustedEUROPE) {
    points.adjusted.USA += 1;
  } else if (matchPlayAdjustedUSA < matchPlayAdjustedEUROPE) {
    points.adjusted.EUROPE += 1;
  } else if (matchPlayAdjustedUSA === matchPlayAdjustedEUROPE) {
    points.adjusted.USA += 0.5;
    points.adjusted.EUROPE += 0.5;
  }

  return points;
}