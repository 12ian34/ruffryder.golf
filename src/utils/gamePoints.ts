import type { Game } from '../types/game';

export function calculateGamePoints(game: Game): { 
  raw: { USA: number, EUROPE: number },
  adjusted: { USA: number, EUROPE: number }
} {
  if (!game.isStarted) return { 
    raw: { USA: 0, EUROPE: 0 },
    adjusted: { USA: 0, EUROPE: 0 }
  };

  // Track who won each category
  const rawWins = {
    strokePlay: '',
    matchPlay: ''
  };

  const adjustedWins = {
    strokePlay: '',
    matchPlay: ''
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

  // Raw points calculation
  // For stroke play, lower score wins
  if (strokePlayUSA !== 0 || strokePlayEUROPE !== 0) {
    if (strokePlayUSA < strokePlayEUROPE) {
      rawWins.strokePlay = 'USA';
    } else if (strokePlayUSA > strokePlayEUROPE) {
      rawWins.strokePlay = 'EUROPE';
    } else {
      rawWins.strokePlay = 'TIE';
    }
  } else {
    rawWins.strokePlay = 'TIE';
  }

  // For match play, higher score wins
  if (matchPlayUSA !== 0 || matchPlayEUROPE !== 0) {
    if (matchPlayUSA > matchPlayEUROPE) {
      rawWins.matchPlay = 'USA';
    } else if (matchPlayUSA < matchPlayEUROPE) {
      rawWins.matchPlay = 'EUROPE';
    } else {
      rawWins.matchPlay = 'TIE';
    }
  } else {
    rawWins.matchPlay = 'TIE';
  }

  // Adjusted points calculation
  // For stroke play, lower score wins
  if (strokePlayAdjustedUSA !== 0 || strokePlayAdjustedEUROPE !== 0) {
    if (strokePlayAdjustedUSA < strokePlayAdjustedEUROPE) {
      adjustedWins.strokePlay = 'USA';
    } else if (strokePlayAdjustedUSA > strokePlayAdjustedEUROPE) {
      adjustedWins.strokePlay = 'EUROPE';
    } else {
      adjustedWins.strokePlay = 'TIE';
    }
  } else {
    adjustedWins.strokePlay = 'TIE';
  }

  // For match play, higher score wins
  if (matchPlayAdjustedUSA !== 0 || matchPlayAdjustedEUROPE !== 0) {
    if (matchPlayAdjustedUSA > matchPlayAdjustedEUROPE) {
      adjustedWins.matchPlay = 'USA';
    } else if (matchPlayAdjustedUSA < matchPlayAdjustedEUROPE) {
      adjustedWins.matchPlay = 'EUROPE';
    } else {
      adjustedWins.matchPlay = 'TIE';
    }
  } else {
    adjustedWins.matchPlay = 'TIE';
  }

  // Calculate raw points based on category wins
  if (rawWins.strokePlay === 'TIE' && rawWins.matchPlay === 'TIE') {
    // Both categories tied
    points.raw.USA = 1;
    points.raw.EUROPE = 1;
  } else if (rawWins.strokePlay === 'TIE' || rawWins.matchPlay === 'TIE') {
    // One category tied, other won by someone
    const winner = rawWins.strokePlay !== 'TIE' ? rawWins.strokePlay : rawWins.matchPlay;
    points.raw[winner as 'USA' | 'EUROPE'] = 1.5;
    points.raw[winner === 'USA' ? 'EUROPE' : 'USA'] = 0.5;
  } else if (rawWins.strokePlay !== rawWins.matchPlay) {
    // Each team won one category
    points.raw.USA = 1;
    points.raw.EUROPE = 1;
  } else {
    // Same team won both categories
    if (rawWins.strokePlay === 'USA') {
      points.raw.USA = 2;
      points.raw.EUROPE = 0;
    } else if (rawWins.strokePlay === 'EUROPE') {
      points.raw.USA = 0;
      points.raw.EUROPE = 2;
    }
  }

  // Calculate adjusted points based on category wins
  if (adjustedWins.strokePlay === 'TIE' && adjustedWins.matchPlay === 'TIE') {
    // Both categories tied
    points.adjusted.USA = 1;
    points.adjusted.EUROPE = 1;
  } else if (adjustedWins.strokePlay === 'TIE' || adjustedWins.matchPlay === 'TIE') {
    // One category tied, other won by someone
    const winner = adjustedWins.strokePlay !== 'TIE' ? adjustedWins.strokePlay : adjustedWins.matchPlay;
    points.adjusted[winner as 'USA' | 'EUROPE'] = 1.5;
    points.adjusted[winner === 'USA' ? 'EUROPE' : 'USA'] = 0.5;
  } else if (adjustedWins.strokePlay !== adjustedWins.matchPlay) {
    // Each team won one category
    points.adjusted.USA = 1;
    points.adjusted.EUROPE = 1;
  } else {
    // Same team won both categories
    if (adjustedWins.strokePlay === 'USA') {
      points.adjusted.USA = 2;
      points.adjusted.EUROPE = 0;
    } else if (adjustedWins.strokePlay === 'EUROPE') {
      points.adjusted.USA = 0;
      points.adjusted.EUROPE = 2;
    }
  }

  return points;
}