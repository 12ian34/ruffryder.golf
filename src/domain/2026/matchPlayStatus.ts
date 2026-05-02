type Team = 'USA' | 'EUROPE';
type HoleOutcome = Team | 'halved' | 'unplayed';

export interface MatchStatusHoleScore {
  hole_number: number;
  outcome: HoleOutcome;
}

export interface MatchStatusSegment {
  hole_start: number;
  hole_end: number;
  holeScores: MatchStatusHoleScore[];
}

export type MatchPlayStatusState = 'not_started' | 'in_progress' | 'dormie' | 'won' | 'halved';

export interface MatchPlayStatus {
  state: MatchPlayStatusState;
  label: string;
  leader: Team | null;
  margin: number;
  holesRemaining: number;
  completedHoles: number;
  totalHoles: number;
}

export interface FixtureProgress {
  completedHoles: number;
  totalHoles: number;
  percent: number;
}

export function calculateSegmentMatchPlayStatus(segment: MatchStatusSegment): MatchPlayStatus {
  const totalHoles = segment.hole_end - segment.hole_start + 1;
  const outcomes = createExpectedOutcomes(segment);
  let usaWins = 0;
  let europeWins = 0;
  let completedHoles = 0;

  for (const outcome of outcomes) {
    if (outcome === 'unplayed') {
      continue;
    }

    completedHoles += 1;

    if (outcome === 'USA') {
      usaWins += 1;
    } else if (outcome === 'EUROPE') {
      europeWins += 1;
    }
  }

  const holesRemaining = totalHoles - completedHoles;
  const margin = Math.abs(usaWins - europeWins);
  const leader = usaWins === europeWins ? null : usaWins > europeWins ? 'USA' : 'EUROPE';

  if (completedHoles === 0) {
    return createStatus('not_started', 'Not started', null, 0, holesRemaining, completedHoles, totalHoles);
  }

  if (!leader) {
    const state = holesRemaining === 0 ? 'halved' : 'in_progress';
    const label = holesRemaining === 0 ? 'Match halved' : 'All square';

    return createStatus(state, label, null, 0, holesRemaining, completedHoles, totalHoles);
  }

  if (margin > holesRemaining) {
    return createStatus(
      'won',
      holesRemaining === 0 ? `${leader} wins by ${margin}` : `${leader} wins ${margin} & ${holesRemaining}`,
      leader,
      margin,
      holesRemaining,
      completedHoles,
      totalHoles
    );
  }

  if (margin === holesRemaining && holesRemaining > 0) {
    return createStatus(
      'dormie',
      `${leader} dormie ${margin}`,
      leader,
      margin,
      holesRemaining,
      completedHoles,
      totalHoles
    );
  }

  return createStatus(
    'in_progress',
    `${leader} ${margin} up`,
    leader,
    margin,
    holesRemaining,
    completedHoles,
    totalHoles
  );
}

export function calculateFixtureProgress(segments: MatchStatusSegment[]): FixtureProgress {
  const totals = segments.reduce(
    (progress, segment) => {
      const status = calculateSegmentMatchPlayStatus(segment);

      return {
        completedHoles: progress.completedHoles + status.completedHoles,
        totalHoles: progress.totalHoles + status.totalHoles,
      };
    },
    { completedHoles: 0, totalHoles: 0 }
  );

  return {
    ...totals,
    percent: totals.totalHoles === 0 ? 0 : Math.round((totals.completedHoles / totals.totalHoles) * 100),
  };
}

function createExpectedOutcomes(segment: MatchStatusSegment): HoleOutcome[] {
  const scoresByHole = new Map(segment.holeScores.map((score) => [score.hole_number, score.outcome]));
  const outcomes: HoleOutcome[] = [];

  for (let holeNumber = segment.hole_start; holeNumber <= segment.hole_end; holeNumber += 1) {
    outcomes.push(scoresByHole.get(holeNumber) ?? 'unplayed');
  }

  return outcomes;
}

function createStatus(
  state: MatchPlayStatusState,
  label: string,
  leader: Team | null,
  margin: number,
  holesRemaining: number,
  completedHoles: number,
  totalHoles: number
): MatchPlayStatus {
  return { state, label, leader, margin, holesRemaining, completedHoles, totalHoles };
}
