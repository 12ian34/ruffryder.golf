export const DEFAULT_CPI_THRESHOLD = 7;
export const FIRST_SINGLES_HOLE = 10;
export const LAST_SINGLES_HOLE = 18;

export type Team = 'USA' | 'EUROPE';
export type SegmentKind = 'foursomes' | 'singles';
export type HoleOutcome = Team | 'HALVED' | 'UNPLAYED';

export interface HoleScoreInput {
  holeNumber: number;
  strokeIndex: number;
  usaScore: number | null;
  europeScore: number | null;
}

export interface CpiInput {
  usaCpi?: number | null;
  europeCpi?: number | null;
  threshold?: number;
}

export interface CpiStrokes {
  applies: boolean;
  threshold: number;
  difference: number;
  higherCpiTeam: Team | null;
  strokes: Record<Team, number>;
}

export interface ScoredHole {
  holeNumber: number;
  segmentKind: SegmentKind;
  raw: {
    USA: number | null;
    EUROPE: number | null;
  };
  net: {
    USA: number | null;
    EUROPE: number | null;
  };
  cpi: CpiStrokes;
  outcome: HoleOutcome;
}

export interface FixtureSummary {
  USA: number;
  EUROPE: number;
  halved: number;
  unplayed: number;
  completed: number;
}

const NO_CPI_STROKES: CpiStrokes = {
  applies: false,
  threshold: DEFAULT_CPI_THRESHOLD,
  difference: 0,
  higherCpiTeam: null,
  strokes: { USA: 0, EUROPE: 0 },
};

export function scoreFoursomesHole(hole: HoleScoreInput): ScoredHole {
  return scoreHoleWithoutCpi(hole, 'foursomes');
}

export function scoreSinglesHole(hole: HoleScoreInput, cpi: CpiInput): ScoredHole {
  const cpiStrokes = calculateCpiStrokesForHole(cpi, hole.strokeIndex);
  const net = {
    USA: hole.usaScore === null ? null : hole.usaScore - cpiStrokes.strokes.USA,
    EUROPE: hole.europeScore === null ? null : hole.europeScore - cpiStrokes.strokes.EUROPE,
  };

  return {
    holeNumber: hole.holeNumber,
    segmentKind: 'singles',
    raw: {
      USA: hole.usaScore,
      EUROPE: hole.europeScore,
    },
    net,
    cpi: cpiStrokes,
    outcome: getMatchPlayOutcome(net.USA, net.EUROPE),
  };
}

export function scoreMatchHole(
  segmentKind: SegmentKind,
  hole: HoleScoreInput,
  cpi: CpiInput = {}
): ScoredHole {
  switch (segmentKind) {
    case 'foursomes':
      return scoreFoursomesHole(hole);
    case 'singles':
      return scoreSinglesHole(hole, cpi);
    default: {
      const exhaustiveCheck: never = segmentKind;
      return exhaustiveCheck;
    }
  }
}

export function calculateCpiStrokesForHole(cpi: CpiInput, strokeIndex: number): CpiStrokes {
  assertValidStrokeIndex(strokeIndex);

  const threshold = cpi.threshold ?? DEFAULT_CPI_THRESHOLD;
  const usaCpi = cpi.usaCpi;
  const europeCpi = cpi.europeCpi;

  if (typeof usaCpi !== 'number' || typeof europeCpi !== 'number') {
    return { ...NO_CPI_STROKES, threshold };
  }

  const difference = Math.abs(usaCpi - europeCpi);

  if (difference < threshold || difference === 0) {
    return {
      applies: false,
      threshold,
      difference,
      higherCpiTeam: null,
      strokes: { USA: 0, EUROPE: 0 },
    };
  }

  const higherCpiTeam: Team = usaCpi > europeCpi ? 'USA' : 'EUROPE';
  const strokesForHole = calculateStrokesForStrokeIndex(difference, strokeIndex);

  return {
    applies: true,
    threshold,
    difference,
    higherCpiTeam,
    strokes: {
      USA: higherCpiTeam === 'USA' ? strokesForHole : 0,
      EUROPE: higherCpiTeam === 'EUROPE' ? strokesForHole : 0,
    },
  };
}

export function summarizeFixtureHoles(holes: ScoredHole[]): FixtureSummary {
  return holes.reduce<FixtureSummary>(
    (summary, hole) => {
      if (hole.outcome === 'USA') {
        summary.USA += 1;
        summary.completed += 1;
      } else if (hole.outcome === 'EUROPE') {
        summary.EUROPE += 1;
        summary.completed += 1;
      } else if (hole.outcome === 'HALVED') {
        summary.halved += 1;
        summary.completed += 1;
      } else {
        summary.unplayed += 1;
      }

      return summary;
    },
    { USA: 0, EUROPE: 0, halved: 0, unplayed: 0, completed: 0 }
  );
}

export function isPlayerHistoryEligibleSegment(segmentKind: SegmentKind): boolean {
  return segmentKind === 'singles';
}

function scoreHoleWithoutCpi(hole: HoleScoreInput, segmentKind: SegmentKind): ScoredHole {
  return {
    holeNumber: hole.holeNumber,
    segmentKind,
    raw: {
      USA: hole.usaScore,
      EUROPE: hole.europeScore,
    },
    net: {
      USA: hole.usaScore,
      EUROPE: hole.europeScore,
    },
    cpi: NO_CPI_STROKES,
    outcome: getMatchPlayOutcome(hole.usaScore, hole.europeScore),
  };
}

function getMatchPlayOutcome(usaScore: number | null, europeScore: number | null): HoleOutcome {
  if (usaScore === null || europeScore === null) {
    return 'UNPLAYED';
  }

  if (usaScore < europeScore) {
    return 'USA';
  }

  if (europeScore < usaScore) {
    return 'EUROPE';
  }

  return 'HALVED';
}

function calculateStrokesForStrokeIndex(totalStrokes: number, strokeIndex: number): number {
  const fullCycles = Math.floor(totalStrokes / 18);
  const remainingStrokes = totalStrokes % 18;

  return fullCycles + (strokeIndex <= remainingStrokes ? 1 : 0);
}

function assertValidStrokeIndex(strokeIndex: number): void {
  if (!Number.isInteger(strokeIndex) || strokeIndex < 1 || strokeIndex > 18) {
    throw new Error(`Invalid stroke index: ${strokeIndex}`);
  }
}
