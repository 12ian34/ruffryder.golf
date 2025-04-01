import type { Game } from '../types/game';

export function calculateGamePoints(game: Game): { USA: number, EUROPE: number } {
  if (!game.isStarted) return { USA: 0, EUROPE: 0 };
  
  const points = {
    USA: 0,
    EUROPE: 0
  };

  // Calculate adjusted scores for stroke play
  const getAdjustedScore = (team: 'USA' | 'EUROPE') => {
    if (team === game.higherHandicapTeam) {
      return game.strokePlayScore[team];
    }
    return game.strokePlayScore[team] + game.handicapStrokes;
  };

  const usaAdjustedScore = getAdjustedScore('USA');
  const europeAdjustedScore = getAdjustedScore('EUROPE');

  // For completed games, use final scores
  if (game.isComplete) {
    // Stroke play point - using adjusted scores
    if (usaAdjustedScore < europeAdjustedScore) {
      points.USA += 1;
    } else if (usaAdjustedScore > europeAdjustedScore) {
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
    // Stroke play point (based on current adjusted scores)
    if (usaAdjustedScore < europeAdjustedScore) {
      points.USA += 1;
    } else if (usaAdjustedScore > europeAdjustedScore) {
      points.EUROPE += 1;
    } else if (usaAdjustedScore > 0 || europeAdjustedScore > 0) {
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