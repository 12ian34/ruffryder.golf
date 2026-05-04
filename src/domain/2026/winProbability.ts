import { calculateSegmentMatchPlayStatus } from './matchPlayStatus';
import { DEFAULT_CPI_THRESHOLD } from './scoring';

export type WinProbabilityTeam = 'USA' | 'EUROPE';
export type WinProbabilityOutcome = WinProbabilityTeam | 'halved' | 'unplayed';
export type WinProbabilitySegmentKind = 'foursomes' | 'singles';

export interface WinProbabilityHoleScore {
  holeNumber: number;
  outcome: WinProbabilityOutcome;
}

export interface WinProbabilitySegmentInput {
  id: string;
  name?: string | null;
  kind: WinProbabilitySegmentKind;
  holeStart: number;
  holeEnd: number;
  cpiEnabled?: boolean | null;
  usaPlayerCpi?: number | null;
  europePlayerCpi?: number | null;
  holeScores: WinProbabilityHoleScore[];
}

export interface WinProbabilityInput {
  segments: WinProbabilitySegmentInput[];
  cpiThreshold?: number | null;
}

export interface WinProbabilityScore {
  USA: number;
  EUROPE: number;
  halved: number;
}

export interface WinProbabilityForecast {
  probabilities: {
    USA: number;
    EUROPE: number;
    tie: number;
  };
  currentScore: WinProbabilityScore;
  remainingHoles: number;
  scoredHoles: number;
  leader: WinProbabilityTeam | null;
  margin: number;
  locked: boolean;
  reasons: string[];
}

interface OutcomeCounts {
  USA: number;
  EUROPE: number;
  halved: number;
}

interface ForecastHole {
  segment: WinProbabilitySegmentInput;
  probabilities: OutcomeCounts;
}

const BASE_PRIOR: OutcomeCounts = { USA: 8, EUROPE: 8, halved: 5 };
const MAX_NON_LOCKED_TEAM_PROBABILITY = 0.98;

export function calculateWinProbability(input: WinProbabilityInput): WinProbabilityForecast {
  const threshold = input.cpiThreshold ?? DEFAULT_CPI_THRESHOLD;
  const currentScore = createEmptyScore();
  const globalObserved = createEmptyCounts();
  const remainingHoles: ForecastHole[] = [];
  let cpiNudgedSegments = 0;

  for (const segment of input.segments) {
    const segmentObserved = countObservedOutcomes(segment.holeScores);
    applyCounts(currentScore, segmentObserved);
    applyCounts(globalObserved, segmentObserved);

    const status = calculateSegmentMatchPlayStatus({
      hole_start: segment.holeStart,
      hole_end: segment.holeEnd,
      holeScores: segment.holeScores.map((score) => ({
        hole_number: score.holeNumber,
        outcome: score.outcome,
      })),
    });

    if (status.state === 'won') {
      continue;
    }

    const scoredByHole = new Map(segment.holeScores.map((score) => [score.holeNumber, score.outcome]));
    const probabilities = calculateHoleProbabilities(segment, segmentObserved, globalObserved, threshold);
    const hasCpiNudge = segment.kind === 'singles' && getCpiNudge(segment, threshold).amount > 0;

    for (let holeNumber = segment.holeStart; holeNumber <= segment.holeEnd; holeNumber += 1) {
      const outcome = scoredByHole.get(holeNumber);

      if (outcome && outcome !== 'unplayed') {
        continue;
      }

      remainingHoles.push({ segment, probabilities });
    }

    if (hasCpiNudge && status.holesRemaining > 0) {
      cpiNudgedSegments += 1;
    }
  }

  const scoredHoles = currentScore.USA + currentScore.EUROPE + currentScore.halved;
  const scoreDiff = currentScore.USA - currentScore.EUROPE;
  const leader = scoreDiff === 0 ? null : scoreDiff > 0 ? 'USA' : 'EUROPE';
  const margin = Math.abs(scoreDiff);
  const locked = scoredHoles > 0 && (margin > remainingHoles.length || remainingHoles.length === 0);
  const probabilities = locked
    ? calculateLockedProbabilities(scoreDiff)
    : capNonLockedProbabilities(runProbabilityDp(scoreDiff, remainingHoles));

  return {
    probabilities,
    currentScore,
    remainingHoles: remainingHoles.length,
    scoredHoles,
    leader,
    margin,
    locked,
    reasons: buildReasons({
      currentScore,
      scoredHoles,
      remainingHoles: remainingHoles.length,
      leader,
      margin,
      locked,
      cpiNudgedSegments,
    }),
  };
}

function calculateHoleProbabilities(
  segment: WinProbabilitySegmentInput,
  segmentObserved: OutcomeCounts,
  globalObserved: OutcomeCounts,
  threshold: number
): OutcomeCounts {
  const counts = {
    USA: BASE_PRIOR.USA + globalObserved.USA * 0.1 + segmentObserved.USA * 0.4,
    EUROPE: BASE_PRIOR.EUROPE + globalObserved.EUROPE * 0.1 + segmentObserved.EUROPE * 0.4,
    halved: BASE_PRIOR.halved + globalObserved.halved * 0.1 + segmentObserved.halved * 0.4,
  };
  const total = counts.USA + counts.EUROPE + counts.halved;
  const probabilities = {
    USA: counts.USA / total,
    EUROPE: counts.EUROPE / total,
    halved: counts.halved / total,
  };
  const cpiNudge = getCpiNudge(segment, threshold);

  if (cpiNudge.amount === 0 || !cpiNudge.team) {
    return probabilities;
  }

  const otherTeam = cpiNudge.team === 'USA' ? 'EUROPE' : 'USA';
  const shift = Math.min(cpiNudge.amount, probabilities[otherTeam] - 0.2);

  if (shift <= 0) {
    return probabilities;
  }

  return {
    ...probabilities,
    [cpiNudge.team]: probabilities[cpiNudge.team] + shift,
    [otherTeam]: probabilities[otherTeam] - shift,
  };
}

function getCpiNudge(
  segment: WinProbabilitySegmentInput,
  threshold: number
): { team: WinProbabilityTeam | null; amount: number } {
  if (
    segment.kind !== 'singles' ||
    segment.cpiEnabled === false ||
    typeof segment.usaPlayerCpi !== 'number' ||
    typeof segment.europePlayerCpi !== 'number' ||
    segment.usaPlayerCpi === segment.europePlayerCpi
  ) {
    return { team: null, amount: 0 };
  }

  const gap = Math.abs(segment.usaPlayerCpi - segment.europePlayerCpi);
  const betterCpiTeam = segment.usaPlayerCpi < segment.europePlayerCpi ? 'USA' : 'EUROPE';
  const nudge = Math.min(0.06, (gap / Math.max(threshold, 1)) * 0.015);

  return { team: betterCpiTeam, amount: nudge };
}

function runProbabilityDp(
  currentDiff: number,
  remainingHoles: ForecastHole[]
): WinProbabilityForecast['probabilities'] {
  let distribution = new Map<number, number>([[currentDiff, 1]]);

  for (const hole of remainingHoles) {
    const next = new Map<number, number>();

    for (const [diff, probability] of distribution) {
      addProbability(next, diff + 1, probability * hole.probabilities.USA);
      addProbability(next, diff - 1, probability * hole.probabilities.EUROPE);
      addProbability(next, diff, probability * hole.probabilities.halved);
    }

    distribution = next;
  }

  const result = { USA: 0, EUROPE: 0, tie: 0 };

  for (const [diff, probability] of distribution) {
    if (diff > 0) {
      result.USA += probability;
    } else if (diff < 0) {
      result.EUROPE += probability;
    } else {
      result.tie += probability;
    }
  }

  return normalizeProbabilities(result);
}

function capNonLockedProbabilities(
  probabilities: WinProbabilityForecast['probabilities']
): WinProbabilityForecast['probabilities'] {
  const usaCapped = capTeamProbability(probabilities, 'USA');

  return capTeamProbability(usaCapped, 'EUROPE');
}

function capTeamProbability(
  probabilities: WinProbabilityForecast['probabilities'],
  team: WinProbabilityTeam
): WinProbabilityForecast['probabilities'] {
  if (probabilities[team] <= MAX_NON_LOCKED_TEAM_PROBABILITY) {
    return probabilities;
  }

  const excess = probabilities[team] - MAX_NON_LOCKED_TEAM_PROBABILITY;
  const otherTeam = team === 'USA' ? 'EUROPE' : 'USA';
  const otherTotal = probabilities[otherTeam] + probabilities.tie;

  if (otherTotal === 0) {
    return {
      ...probabilities,
      [team]: MAX_NON_LOCKED_TEAM_PROBABILITY,
      tie: excess,
    };
  }

  return {
    ...probabilities,
    [team]: MAX_NON_LOCKED_TEAM_PROBABILITY,
    [otherTeam]: probabilities[otherTeam] + excess * (probabilities[otherTeam] / otherTotal),
    tie: probabilities.tie + excess * (probabilities.tie / otherTotal),
  };
}

function calculateLockedProbabilities(currentDiff: number): WinProbabilityForecast['probabilities'] {
  if (currentDiff > 0) {
    return { USA: 1, EUROPE: 0, tie: 0 };
  }

  if (currentDiff < 0) {
    return { USA: 0, EUROPE: 1, tie: 0 };
  }

  return { USA: 0, EUROPE: 0, tie: 1 };
}

function normalizeProbabilities(
  probabilities: WinProbabilityForecast['probabilities']
): WinProbabilityForecast['probabilities'] {
  const total = probabilities.USA + probabilities.EUROPE + probabilities.tie;

  if (total === 0) {
    return { USA: 0, EUROPE: 0, tie: 1 };
  }

  return {
    USA: probabilities.USA / total,
    EUROPE: probabilities.EUROPE / total,
    tie: probabilities.tie / total,
  };
}

function buildReasons({
  currentScore,
  scoredHoles,
  remainingHoles,
  leader,
  margin,
  locked,
  cpiNudgedSegments,
}: {
  currentScore: WinProbabilityScore;
  scoredHoles: number;
  remainingHoles: number;
  leader: WinProbabilityTeam | null;
  margin: number;
  locked: boolean;
  cpiNudgedSegments: number;
}): string[] {
  if (scoredHoles === 0) {
    const holeWord = remainingHoles === 1 ? 'hole' : 'holes';

    return [
      'No saved holes yet; forecast starts neutral.',
      `${remainingHoles} ${holeWord} still live. forecast, not fate.`,
    ];
  }

  const holeWord = remainingHoles === 1 ? 'hole' : 'holes';
  const leadLine = leader
    ? `${leader === 'USA' ? 'USA' : 'Europe'} lead +${margin} with ${remainingHoles} ${holeWord} still live.`
    : `All square with ${remainingHoles} ${holeWord} still live.`;
  const lines = [
    leadLine,
    `Saved board is USA ${currentScore.USA} - Europe ${currentScore.EUROPE}; ${currentScore.halved} halved.`,
  ];

  if (locked && leader) {
    lines.push(`${leader === 'USA' ? 'USA' : 'Europe'} are mathematically locked from the saved board.`);
  } else if (cpiNudgedSegments > 0) {
    lines.push(`Singles CPI adds a small bounded nudge in ${cpiNudgedSegments} live matchup${cpiNudgedSegments === 1 ? '' : 's'}.`);
  } else if (remainingHoles >= Math.max(6, scoredHoles)) {
    lines.push('Plenty of holes remain; chaos still live.');
  }

  return lines;
}

function countObservedOutcomes(scores: WinProbabilityHoleScore[]): OutcomeCounts {
  const counts = createEmptyCounts();

  for (const score of scores) {
    if (score.outcome === 'USA') {
      counts.USA += 1;
    } else if (score.outcome === 'EUROPE') {
      counts.EUROPE += 1;
    } else if (score.outcome === 'halved') {
      counts.halved += 1;
    }
  }

  return counts;
}

function createEmptyScore(): WinProbabilityScore {
  return { USA: 0, EUROPE: 0, halved: 0 };
}

function createEmptyCounts(): OutcomeCounts {
  return { USA: 0, EUROPE: 0, halved: 0 };
}

function applyCounts(target: OutcomeCounts, source: OutcomeCounts): void {
  target.USA += source.USA;
  target.EUROPE += source.EUROPE;
  target.halved += source.halved;
}

function addProbability(distribution: Map<number, number>, diff: number, probability: number): void {
  distribution.set(diff, (distribution.get(diff) ?? 0) + probability);
}
