import type {
  FixtureView,
  PlayerRow,
  TournamentRow,
} from '../../services/tournament2026Queries';
import type { CourseHoleMetadata } from '../../domain/2026/course';

type Team = 'USA' | 'EUROPE';

export interface ProgressPoint {
  id: string;
  label: string;
  usa: number;
  europe: number;
  halved: number;
  updatedAt: string;
}

interface ScoredSide {
  label: string;
  score: number;
  holeNumber: number;
  par: number | null;
}

export function buildProgressTimeline(fixtures: FixtureView[]): ProgressPoint[] {
  const scoreRows = fixtures
    .flatMap((fixture) =>
      fixture.segments.flatMap((segment) =>
        segment.holeScores
          .filter((score) => score.outcome !== 'unplayed')
          .map((score) => ({
            id: score.id,
            fixtureName: fixture.name ?? `Fixture ${fixture.sort_order + 1}`,
            holeNumber: score.hole_number,
            outcome: score.outcome,
            updatedAt: score.updated_at,
          }))
      )
    )
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const totals = { USA: 0, EUROPE: 0, halved: 0 };

  return scoreRows.map((score) => {
    if (score.outcome === 'USA') {
      totals.USA += 1;
    } else if (score.outcome === 'EUROPE') {
      totals.EUROPE += 1;
    } else {
      totals.halved += 1;
    }

    return {
      id: score.id,
      label: `${score.fixtureName} H${score.holeNumber}`,
      usa: totals.USA,
      europe: totals.EUROPE,
      halved: totals.halved,
      updatedAt: score.updatedAt,
    };
  });
}

export function generateTournamentHighlights({
  tournament,
  fixtures,
  players,
  courseHoles,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
}): string[] {
  const highlights: string[] = [];
  const scoredSides = collectScoredSides(fixtures, players, courseHoles);
  const blowUp = scoredSides.reduce<ScoredSide | null>(
    (current, score) => (!current || score.score > current.score ? score : current),
    null
  );

  if (blowUp && blowUp.score >= 6) {
    highlights.push(`${blowUp.label} took ${blowUp.score} on H${blowUp.holeNumber}.`);
  }

  const aces = scoredSides.filter((score) => score.score === 1);
  highlights.push(...aces.slice(0, 3).map((score) => `${score.label} made an ace on H${score.holeNumber}.`));

  const birdies = scoredSides.filter(
    (score) => typeof score.par === 'number' && score.score === score.par - 1
  );
  highlights.push(
    ...birdies.slice(0, 5).map((score) => `${score.label} birdied H${score.holeNumber}.`)
  );

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const longestHalvedRun = getLongestHalvedRun(segment.holeScores);

      if (longestHalvedRun >= 3) {
        highlights.push(
          `${segment.name ?? fixture.name ?? 'A match'} had ${longestHalvedRun} halved holes in a row.`
        );
      }

      const upset = getUpsetHighlight(segment, players, tournament?.cpi_threshold ?? 7);

      if (upset) {
        highlights.push(upset);
      }
    }
  }

  return dedupe(highlights).slice(0, 8);
}

function collectScoredSides(
  fixtures: FixtureView[],
  players: PlayerRow[],
  courseHoles: CourseHoleMetadata[]
): ScoredSide[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const parByHole = new Map(courseHoles.map((hole) => [hole.holeNumber, hole.par]));
  const scoredSides: ScoredSide[] = [];

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const usaLabel = segment.usa_player_id
        ? playerLookup.get(segment.usa_player_id)?.name ?? 'Side A'
        : 'USA';
      const europeLabel = segment.europe_player_id
        ? playerLookup.get(segment.europe_player_id)?.name ?? 'Side B'
        : 'Europe';

      for (const score of segment.holeScores) {
        const par = parByHole.get(score.hole_number) ?? null;

        if (score.usa_score !== null) {
          scoredSides.push({ label: usaLabel, score: score.usa_score, holeNumber: score.hole_number, par });
        }

        if (score.europe_score !== null) {
          scoredSides.push({
            label: europeLabel,
            score: score.europe_score,
            holeNumber: score.hole_number,
            par,
          });
        }
      }
    }
  }

  return scoredSides;
}

function getLongestHalvedRun(scores: FixtureView['segments'][number]['holeScores']): number {
  let currentRun = 0;
  let longestRun = 0;

  for (const score of [...scores].sort((a, b) => a.hole_number - b.hole_number)) {
    if (score.outcome === 'halved') {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return longestRun;
}

function getUpsetHighlight(
  segment: FixtureView['segments'][number],
  players: PlayerRow[],
  threshold: number
): string | null {
  if (segment.kind !== 'singles' || !segment.usa_player_id || !segment.europe_player_id) {
    return null;
  }

  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const usaPlayer = playerLookup.get(segment.usa_player_id);
  const europePlayer = playerLookup.get(segment.europe_player_id);

  if (!usaPlayer || !europePlayer || usaPlayer.current_cpi === null || europePlayer.current_cpi === null) {
    return null;
  }

  const cpiGap = Math.abs(usaPlayer.current_cpi - europePlayer.current_cpi);

  if (cpiGap < threshold) {
    return null;
  }

  const winner = getSegmentWinner(segment.holeScores);

  if (!winner) {
    return null;
  }

  const higherCpiTeam: Team = usaPlayer.current_cpi > europePlayer.current_cpi ? 'USA' : 'EUROPE';

  if (winner !== higherCpiTeam) {
    return null;
  }

  const winnerName = higherCpiTeam === 'USA' ? usaPlayer.name : europePlayer.name;
  const opponentName = higherCpiTeam === 'USA' ? europePlayer.name : usaPlayer.name;

  return `${winnerName} beat the CPI odds against ${opponentName}.`;
}

function getSegmentWinner(scores: FixtureView['segments'][number]['holeScores']): Team | null {
  const totals = scores.reduce(
    (score, hole) => {
      if (hole.outcome === 'USA') {
        score.USA += 1;
      } else if (hole.outcome === 'EUROPE') {
        score.EUROPE += 1;
      }

      return score;
    },
    { USA: 0, EUROPE: 0 }
  );

  if (totals.USA === totals.EUROPE) {
    return null;
  }

  return totals.USA > totals.EUROPE ? 'USA' : 'EUROPE';
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}
