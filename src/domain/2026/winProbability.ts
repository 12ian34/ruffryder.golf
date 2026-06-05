import {
  calculateSegmentMatchPlayStatus,
  type MatchPlayStatus,
} from './matchPlayStatus';
import { DEFAULT_CPI_THRESHOLD } from './scoring';

export type WinProbabilityTeam = 'USA' | 'EUROPE';
export type WinProbabilityOutcome = WinProbabilityTeam | 'halved' | 'unplayed';
export type WinProbabilitySegmentKind = 'foursomes' | 'singles';

export interface WinProbabilityHoleScore {
  holeNumber: number;
  outcome: WinProbabilityOutcome;
  usaScore?: number | null;
  europeScore?: number | null;
  usaNetScore?: number | null;
  europeNetScore?: number | null;
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
  fixtures?: WinProbabilityFixtureInput[];
  segments: WinProbabilitySegmentInput[];
  cpiThreshold?: number | null;
}

export interface WinProbabilityScore {
  USA: number;
  EUROPE: number;
  halved: number;
}

export interface WinProbabilityPointScore {
  USA: number;
  EUROPE: number;
}

export interface WinProbabilityFixtureInput {
  id: string;
  isOneVOne: boolean;
  segments: WinProbabilitySegmentInput[];
}

export interface WinProbabilityForecast {
  probabilities: {
    USA: number;
    EUROPE: number;
    tie: number;
  };
  currentScore: WinProbabilityScore;
  currentPoints: WinProbabilityPointScore;
  remainingHoles: number;
  livePoints: number;
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

interface SegmentPointDistribution {
  usaWin: number;
  europeWin: number;
  halved: number;
}

interface StrokePointDistribution extends SegmentPointDistribution {
  hasSignal: boolean;
}

const BASE_PRIOR: OutcomeCounts = { USA: 8, EUROPE: 8, halved: 5 };
const MAX_NON_LOCKED_TEAM_PROBABILITY = 0.98;

export function calculateWinProbability(input: WinProbabilityInput): WinProbabilityForecast {
  const threshold = input.cpiThreshold ?? DEFAULT_CPI_THRESHOLD;
  const fixtures = normalizeFixtures(input);
  const segments = fixtures.flatMap((fixture) => fixture.segments);
  const currentHoles = createEmptyScore();
  const currentPoints = createEmptyPointScore();
  const globalObserved = createEmptyCounts();
  const segmentDistributions: SegmentPointDistribution[] = [];
  let remainingHoles = 0;
  let livePoints = 0;
  let cpiNudgedSegments = 0;

  for (const segment of segments) {
    applyCounts(globalObserved, countObservedOutcomes(segment.holeScores));
  }

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const segmentObserved = countObservedOutcomes(segment.holeScores);
      applyCounts(currentHoles, segmentObserved);

      const status = calculateSegmentMatchPlayStatus({
        hole_start: segment.holeStart,
        hole_end: segment.holeEnd,
        holeScores: segment.holeScores.map((score) => ({
          hole_number: score.holeNumber,
          outcome: score.outcome,
        })),
      });
      const segmentDistribution = calculateSegmentPointDistribution(
        segment,
        segmentObserved,
        globalObserved,
        threshold,
        status
      );
      segmentDistributions.push(segmentDistribution);
      addCurrentMatchPoints(currentPoints, status);

      if (segmentDistribution.usaWin !== 1 && segmentDistribution.europeWin !== 1 && segmentDistribution.halved !== 1) {
        livePoints += 1;
      }

      remainingHoles += status.state === 'won' ? 0 : countRemainingHoles(segment);

      if (fixture.isOneVOne && segment.kind === 'singles') {
        const strokeDistribution = calculateStrokePointDistribution(segment, segmentDistribution);
        segmentDistributions.push(strokeDistribution);
        addCurrentStrokePoints(currentPoints, segment);
        if (strokeDistribution.usaWin !== 1 && strokeDistribution.europeWin !== 1 && strokeDistribution.halved !== 1) {
          livePoints += 1;
        }
      }

      const hasCpiNudge = segment.kind === 'singles' && getCpiNudge(segment, threshold).amount > 0;
      if (hasCpiNudge && status.holesRemaining > 0) {
        cpiNudgedSegments += 1;
      }
    }
  }

  const scoredHoles = currentHoles.USA + currentHoles.EUROPE + currentHoles.halved;
  const pointDiff = currentPoints.USA - currentPoints.EUROPE;
  const leader = pointDiff === 0 ? null : pointDiff > 0 ? 'USA' : 'EUROPE';
  const rawProbabilities = runPointProbabilityDp(segmentDistributions);
  const locked = scoredHoles > 0 && (
    rawProbabilities.USA === 1 ||
    rawProbabilities.EUROPE === 1 ||
    rawProbabilities.tie === 1
  );
  const probabilities = locked ? rawProbabilities : capNonLockedProbabilities(rawProbabilities);
  const margin = Math.abs(pointDiff);

  return {
    probabilities,
    currentScore: currentHoles,
    currentPoints,
    remainingHoles,
    livePoints,
    scoredHoles,
    leader,
    margin,
    locked,
    reasons: buildReasons({
      currentPoints,
      scoredHoles,
      remainingHoles,
      livePoints,
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
  const higherCpiTeam = segment.usaPlayerCpi > segment.europePlayerCpi ? 'USA' : 'EUROPE';
  const nudge = Math.min(0.06, (gap / Math.max(threshold, 1)) * 0.015);

  return { team: higherCpiTeam, amount: nudge };
}

function calculateSegmentPointDistribution(
  segment: WinProbabilitySegmentInput,
  segmentObserved: OutcomeCounts,
  globalObserved: OutcomeCounts,
  threshold: number,
  status: MatchPlayStatus
): SegmentPointDistribution {
  if (status.state === 'won' && status.leader) {
    return fixedPointDistribution(status.leader);
  }

  if (status.state === 'halved') {
    return fixedPointDistribution('halved');
  }

  const remainingHoles = countRemainingHoles(segment);
  if (remainingHoles === 0) {
    return fixedPointDistribution(status.leader ?? 'halved');
  }

  const holeProbabilities = calculateHoleProbabilities(segment, segmentObserved, globalObserved, threshold);
  const currentDiff = segmentObserved.USA - segmentObserved.EUROPE;

  return runSegmentHoleDp(currentDiff, remainingHoles, holeProbabilities);
}

function runSegmentHoleDp(
  currentDiff: number,
  remainingHoles: number,
  probabilities: OutcomeCounts
): SegmentPointDistribution {
  let distribution = new Map<number, number>([[currentDiff, 1]]);

  for (let index = 0; index < remainingHoles; index += 1) {
    const next = new Map<number, number>();

    for (const [diff, probability] of distribution) {
      addProbability(next, diff + 1, probability * probabilities.USA);
      addProbability(next, diff - 1, probability * probabilities.EUROPE);
      addProbability(next, diff, probability * probabilities.halved);
    }

    distribution = next;
  }

  const result = { usaWin: 0, europeWin: 0, halved: 0 };

  for (const [diff, probability] of distribution) {
    if (diff > 0) {
      result.usaWin += probability;
    } else if (diff < 0) {
      result.europeWin += probability;
    } else {
      result.halved += probability;
    }
  }

  return normalizeSegmentDistribution(result);
}

function runPointProbabilityDp(
  segmentDistributions: SegmentPointDistribution[]
): WinProbabilityForecast['probabilities'] {
  let distribution = new Map<number, number>([[0, 1]]);

  for (const segment of segmentDistributions) {
    const next = new Map<number, number>();

    for (const [diff, probability] of distribution) {
      addProbability(next, diff + 2, probability * segment.usaWin);
      addProbability(next, diff - 2, probability * segment.europeWin);
      addProbability(next, diff, probability * segment.halved);
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

function fixedPointDistribution(outcome: WinProbabilityTeam | 'halved'): SegmentPointDistribution {
  if (outcome === 'USA') {
    return { usaWin: 1, europeWin: 0, halved: 0 };
  }

  if (outcome === 'EUROPE') {
    return { usaWin: 0, europeWin: 1, halved: 0 };
  }

  return { usaWin: 0, europeWin: 0, halved: 1 };
}

function normalizeSegmentDistribution(distribution: SegmentPointDistribution): SegmentPointDistribution {
  const total = distribution.usaWin + distribution.europeWin + distribution.halved;

  if (total === 0) {
    return fixedPointDistribution('halved');
  }

  return {
    usaWin: distribution.usaWin / total,
    europeWin: distribution.europeWin / total,
    halved: distribution.halved / total,
  };
}

function calculateStrokePointDistribution(
  segment: WinProbabilitySegmentInput,
  matchDistribution: SegmentPointDistribution
): StrokePointDistribution {
  const scored = getStrokeSignal(segment);

  if (scored.scoredHoles === 0) {
    return { ...matchDistribution, hasSignal: false };
  }

  const remainingHoles = countRemainingHoles(segment);
  let distribution = new Map<number, number>([[scored.diff, 1]]);

  for (let index = 0; index < remainingHoles; index += 1) {
    const next = new Map<number, number>();

    for (const [diff, probability] of distribution) {
      addProbability(next, diff + 1, probability * matchDistribution.usaWin);
      addProbability(next, diff - 1, probability * matchDistribution.europeWin);
      addProbability(next, diff, probability * matchDistribution.halved);
    }

    distribution = next;
  }

  const result = { usaWin: 0, europeWin: 0, halved: 0 };

  for (const [diff, probability] of distribution) {
    if (diff > 0) {
      result.usaWin += probability;
    } else if (diff < 0) {
      result.europeWin += probability;
    } else {
      result.halved += probability;
    }
  }

  return { ...normalizeSegmentDistribution(result), hasSignal: true };
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
  currentPoints,
  scoredHoles,
  remainingHoles,
  livePoints,
  leader,
  margin,
  locked,
  cpiNudgedSegments,
}: {
  currentPoints: WinProbabilityPointScore;
  scoredHoles: number;
  remainingHoles: number;
  livePoints: number;
  leader: WinProbabilityTeam | null;
  margin: number;
  locked: boolean;
  cpiNudgedSegments: number;
}): string[] {
  if (scoredHoles === 0) {
    const pointWord = livePoints === 1 ? 'point' : 'points';

    return [
      'No saved holes yet; points forecast starts neutral.',
      `${livePoints} ${pointWord} on the table. forecast, not fate.`,
    ];
  }

  const pointWord = livePoints === 1 ? 'point' : 'points';
  const leadLine = leader
    ? `${leader === 'USA' ? 'USA' : 'Europe'} lead +${formatPointValue(margin)} on projected points with ${livePoints} ${pointWord} still live.`
    : `All square on projected points with ${livePoints} ${pointWord} still live.`;
  const lines = [
    leadLine,
    `Projected points board is USA ${formatPointValue(currentPoints.USA)} - Europe ${formatPointValue(currentPoints.EUROPE)}.`,
  ];

  if (locked && leader) {
    lines.push(`${leader === 'USA' ? 'USA' : 'Europe'} are mathematically locked on points.`);
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

function countRemainingHoles(segment: WinProbabilitySegmentInput): number {
  const scoredByHole = new Map(segment.holeScores.map((score) => [score.holeNumber, score.outcome]));
  let count = 0;

  for (let holeNumber = segment.holeStart; holeNumber <= segment.holeEnd; holeNumber += 1) {
    const outcome = scoredByHole.get(holeNumber);
    if (!outcome || outcome === 'unplayed') {
      count += 1;
    }
  }

  return count;
}

function addCurrentMatchPoints(points: WinProbabilityPointScore, status: MatchPlayStatus): void {
  if (status.state === 'won' && status.leader) {
    points[status.leader] += 1;
  } else if (status.state === 'halved') {
    points.USA += 0.5;
    points.EUROPE += 0.5;
  } else if (status.state === 'dormie' && status.leader) {
    points[status.leader] += 1;
  } else if (status.state === 'in_progress') {
    if (status.leader) {
      points[status.leader] += 1;
    } else {
      points.USA += 0.5;
      points.EUROPE += 0.5;
    }
  }
}

function addCurrentStrokePoints(points: WinProbabilityPointScore, segment: WinProbabilitySegmentInput): void {
  const signal = getStrokeSignal(segment);

  if (signal.scoredHoles === 0) {
    return;
  }

  if (signal.diff > 0) {
    points.USA += 1;
  } else if (signal.diff < 0) {
    points.EUROPE += 1;
  } else {
    points.USA += 0.5;
    points.EUROPE += 0.5;
  }
}

function getStrokeSignal(segment: WinProbabilitySegmentInput): { diff: number; scoredHoles: number } {
  let usaTotal = 0;
  let europeTotal = 0;
  let scoredHoles = 0;

  for (const score of segment.holeScores) {
    if (score.outcome === 'unplayed') continue;
    const usa = getStrokeScore(score, 'USA', segment.cpiEnabled !== false);
    const europe = getStrokeScore(score, 'EUROPE', segment.cpiEnabled !== false);

    if (usa === null || europe === null) continue;
    usaTotal += usa;
    europeTotal += europe;
    scoredHoles += 1;
  }

  return { diff: europeTotal - usaTotal, scoredHoles };
}

function getStrokeScore(
  score: WinProbabilityHoleScore,
  team: WinProbabilityTeam,
  useNet: boolean
): number | null {
  if (team === 'USA') {
    return useNet ? score.usaNetScore ?? score.usaScore ?? null : score.usaScore ?? null;
  }

  return useNet ? score.europeNetScore ?? score.europeScore ?? null : score.europeScore ?? null;
}

function normalizeFixtures(input: WinProbabilityInput): WinProbabilityFixtureInput[] {
  if (input.fixtures) {
    return input.fixtures;
  }

  return [
    {
      id: 'default',
      isOneVOne: false,
      segments: input.segments,
    },
  ];
}

function createEmptyScore(): WinProbabilityScore {
  return { USA: 0, EUROPE: 0, halved: 0 };
}

function createEmptyPointScore(): WinProbabilityPointScore {
  return { USA: 0, EUROPE: 0 };
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

function formatPointValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}
