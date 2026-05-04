import type {
  FixtureView,
  PlayerRow,
  TournamentRow,
} from '../../services/tournament2026Queries';
import type { CourseHoleMetadata } from '../../domain/2026/course';
import { calculateSegmentMatchPlayStatus } from '../../domain/2026/matchPlayStatus';
import { calculatePointTotals } from '../../domain/2026/points';
import { normalizePlayerTier } from './viewUtils';

type Team = 'USA' | 'EUROPE';

export interface ProgressPointPlayer {
  player: PlayerRow | null;
  playerId: string | null;
  name: string;
  currentCpi: number | null;
}

export interface ProgressPointSide {
  team: Team;
  players: ProgressPointPlayer[];
}

export interface ProgressPoint {
  id: string;
  label: string;
  holeNumber: number;
  sides: ProgressPointSide[];
  usa: number;
  europe: number;
  halved: number;
  updatedAt: string;
  holeOutcome: 'USA' | 'EUROPE' | 'halved';
  holeUsaScore: number | null;
  holeEuropeScore: number | null;
}

interface ScoredSide {
  label: string;
  score: number;
  holeNumber: number;
  par: number | null;
  tier: number;
}

interface HighlightCandidate {
  text: string;
  priority: number;
  holeNumber: number;
  score?: number;
}

export function buildProgressTimeline(fixtures: FixtureView[], players: PlayerRow[] = []): ProgressPoint[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
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
            sides: buildProgressSides(fixture, segment, playerLookup),
            updatedAt: score.updated_at,
            usaScore: score.usa_score,
            europeScore: score.europe_score,
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
      holeNumber: score.holeNumber,
      sides: score.sides,
      usa: totals.USA,
      europe: totals.EUROPE,
      halved: totals.halved,
      updatedAt: score.updatedAt,
      holeOutcome: score.outcome === 'unplayed' ? 'halved' : score.outcome,
      holeUsaScore: score.usaScore,
      holeEuropeScore: score.europeScore,
    };
  });
}

export function buildPointsProgressTimeline(
  fixtures: FixtureView[],
  players: PlayerRow[] = []
): ProgressPoint[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const events = fixtures
    .flatMap((fixture) =>
      fixture.segments.flatMap((segment) =>
        segment.holeScores
          .filter((score) => score.outcome !== 'unplayed')
          .map((score) => ({ fixture, segment, score }))
      )
    )
    .sort((a, b) => new Date(a.score.updated_at).getTime() - new Date(b.score.updated_at).getTime());

  const segmentHoles = new Map<string, FixtureView['segments'][number]['holeScores']>();
  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      segmentHoles.set(segment.id, []);
    }
  }

  return events.map((event) => {
    const accumulated = segmentHoles.get(event.segment.id) ?? [];
    const filtered = accumulated.filter((score) => score.hole_number !== event.score.hole_number);
    filtered.push(event.score);
    segmentHoles.set(event.segment.id, filtered);

    const snapshotFixtures: FixtureView[] = fixtures.map((fixture) => ({
      ...fixture,
      segments: fixture.segments.map((segment) => ({
        ...segment,
        holeScores: segmentHoles.get(segment.id) ?? [],
      })),
    }));

    const totals = calculatePointTotals(snapshotFixtures);

    return {
      id: event.score.id,
      label: `${event.fixture.name ?? `Fixture ${event.fixture.sort_order + 1}`} H${event.score.hole_number}`,
      holeNumber: event.score.hole_number,
      sides: buildProgressSides(event.fixture, event.segment, playerLookup),
      usa: totals.provisional.overall.USA,
      europe: totals.provisional.overall.EUROPE,
      halved: 0,
      updatedAt: event.score.updated_at,
      holeOutcome: event.score.outcome === 'unplayed' ? 'halved' : event.score.outcome,
      holeUsaScore: event.score.usa_score,
      holeEuropeScore: event.score.europe_score,
    };
  });
}

function buildProgressSides(
  fixture: FixtureView,
  segment: FixtureView['segments'][number],
  playerLookup: Map<string, PlayerRow>
): ProgressPointSide[] {
  if (segment.kind === 'foursomes') {
    return (['USA', 'EUROPE'] as const).map((team) => ({
      team,
      players: buildFoursomesProgressPlayers(fixture, segment, team, playerLookup),
    }));
  }

  return [
    {
      team: 'USA',
      players: [buildProgressPlayer(segment.usa_player_id, 'USA player', playerLookup)],
    },
    {
      team: 'EUROPE',
      players: [buildProgressPlayer(segment.europe_player_id, 'Europe player', playerLookup)],
    },
  ];
}

function buildFoursomesProgressPlayers(
  fixture: FixtureView,
  segment: FixtureView['segments'][number],
  team: Team,
  playerLookup: Map<string, PlayerRow>
): ProgressPointPlayer[] {
  const segmentPlayers = segment.players.filter((segmentPlayer) => segmentPlayer.team === team);
  const sourcePlayers =
    segmentPlayers.length > 0
      ? segmentPlayers
      : fixture.participants.length <= 4
        ? fixture.participants.filter((participant) => participant.team === team)
        : [];

  return sourcePlayers.map((sourcePlayer) =>
    buildProgressPlayer(
      sourcePlayer.player_id,
      team === 'USA' ? 'USA player' : 'Europe player',
      playerLookup,
      sourcePlayer.player
    )
  );
}

function buildProgressPlayer(
  playerId: string | null | undefined,
  fallbackName: string,
  playerLookup: Map<string, PlayerRow>,
  sourcePlayer?: PlayerRow | null
): ProgressPointPlayer {
  const player = sourcePlayer ?? (playerId ? playerLookup.get(playerId) ?? null : null);

  return {
    player,
    playerId: playerId ?? player?.id ?? null,
    name: player?.name ?? fallbackName,
    currentCpi: player?.current_cpi ?? null,
  };
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
  const badScores = scoredSides
    .map(getBadScoreHighlight)
    .filter(isHighlightCandidate)
    .sort(compareHighlightCandidates);
  const positiveScores = scoredSides
    .map(getPositiveScoreHighlight)
    .filter(isHighlightCandidate)
    .sort(compareHighlightCandidates);
  const smackdowns = collectSmackdownHighlights(fixtures, players);
  const closeMatches: string[] = [];
  const halvedRuns: string[] = [];
  const earlyWins: string[] = [];
  const upsets: string[] = [];

  highlights.push(...badScores.slice(0, 2).map((candidate) => candidate.text));
  highlights.push(...positiveScores.slice(0, 3).map((candidate) => candidate.text));
  highlights.push(...smackdowns.slice(0, 1));

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const longestHalvedRun = getLongestHalvedRun(segment.holeScores);

      if (longestHalvedRun >= 3) {
        halvedRuns.push(
          `${segment.name ?? fixture.name ?? 'A match'} had ${longestHalvedRun} halved holes in a row.`
        );
      }

      const closeMatch = getCloseMatchHighlight(fixture, segment, players);

      if (closeMatch) {
        closeMatches.push(closeMatch);
      }

      const earlyWin = getEarlyWinHighlight(fixture, segment, players);

      if (earlyWin) {
        earlyWins.push(earlyWin);
      }

      const upset = getUpsetHighlight(segment, players, tournament?.cpi_threshold ?? 7);

      if (upset) {
        upsets.push(upset);
      }
    }
  }

  highlights.push(...closeMatches.slice(0, 1));
  highlights.push(...halvedRuns.slice(0, 1));
  highlights.push(...earlyWins.slice(0, 2));
  highlights.push(...upsets.slice(0, 1));

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
      const usaTier = segment.usa_player_id
        ? normalizePlayerTier(playerLookup.get(segment.usa_player_id)?.tier)
        : 2;
      const europeTier = segment.europe_player_id
        ? normalizePlayerTier(playerLookup.get(segment.europe_player_id)?.tier)
        : 2;

      for (const score of segment.holeScores) {
        const par = parByHole.get(score.hole_number) ?? null;

        if (score.usa_score !== null) {
          scoredSides.push({
            label: usaLabel,
            score: score.usa_score,
            holeNumber: score.hole_number,
            par,
            tier: usaTier,
          });
        }

        if (score.europe_score !== null) {
          scoredSides.push({
            label: europeLabel,
            score: score.europe_score,
            holeNumber: score.hole_number,
            par,
            tier: europeTier,
          });
        }
      }
    }
  }

  return scoredSides;
}

function getBadScoreHighlight(score: ScoredSide): HighlightCandidate | null {
  const tier = normalizePlayerTier(score.tier);
  const threshold = typeof score.par === 'number'
    ? score.par + getTierBadScoreOffset(tier)
    : getTierBadScoreFallback(tier);

  if (score.score < threshold) {
    return null;
  }

  return {
    text: `${score.label} took ${score.score} on H${score.holeNumber}.`,
    priority: tier,
    holeNumber: score.holeNumber,
    score: -score.score,
  };
}

function getPositiveScoreHighlight(score: ScoredSide): HighlightCandidate | null {
  if (score.score === 1) {
    return {
      text: `${score.label} made an ace on H${score.holeNumber}.`,
      priority: 0,
      holeNumber: score.holeNumber,
      score: score.score,
    };
  }

  if (typeof score.par !== 'number') {
    return null;
  }

  const tier = normalizePlayerTier(score.tier);

  if (tier === 3 && score.score <= score.par) {
    return {
      text: score.score < score.par
        ? `${score.label} birdied H${score.holeNumber}.`
        : `${score.label} made par on H${score.holeNumber}.`,
      priority: score.score < score.par ? 1 : 2,
      holeNumber: score.holeNumber,
      score: score.score - score.par,
    };
  }

  if (score.score <= score.par - 1) {
    return {
      text: `${score.label} birdied H${score.holeNumber}.`,
      priority: tier === 2 ? 3 : 4,
      holeNumber: score.holeNumber,
      score: score.score - score.par,
    };
  }

  return null;
}

function getTierBadScoreOffset(tier: 1 | 2 | 3): number {
  if (tier === 1) {
    return 2;
  }

  return tier === 2 ? 3 : 4;
}

function getTierBadScoreFallback(tier: 1 | 2 | 3): number {
  if (tier === 1) {
    return 5;
  }

  return tier === 2 ? 6 : 7;
}

function compareHighlightCandidates(a: HighlightCandidate, b: HighlightCandidate): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  if ((a.score ?? 0) !== (b.score ?? 0)) {
    return (a.score ?? 0) - (b.score ?? 0);
  }

  return a.holeNumber - b.holeNumber;
}

function isHighlightCandidate(candidate: HighlightCandidate | null): candidate is HighlightCandidate {
  return candidate !== null;
}

function collectSmackdownHighlights(fixtures: FixtureView[], players: PlayerRow[]): string[] {
  const highlights: string[] = [];

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      for (const score of segment.holeScores) {
        if (
          score.usa_score === null ||
          score.europe_score === null ||
          score.outcome === 'halved' ||
          score.outcome === 'unplayed'
        ) {
          continue;
        }

        const margin = Math.abs(score.usa_score - score.europe_score);

        if (margin < 4) {
          continue;
        }

        const winnerLabel = getSegmentSideLabel(segment, score.outcome, players);
        highlights.push(`${winnerLabel} won H${score.hole_number} by ${margin} gross shots.`);
      }
    }
  }

  return highlights;
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

function getCloseMatchHighlight(
  fixture: FixtureView,
  segment: FixtureView['segments'][number],
  players: PlayerRow[]
): string | null {
  const progressiveScores: FixtureView['segments'][number]['holeScores'] = [];
  const segmentLabel = segment.name ?? fixture.name ?? 'A match';
  let oneUpFallback: string | null = null;

  for (const score of [...segment.holeScores].sort((a, b) => a.hole_number - b.hole_number)) {
    if (score.outcome === 'unplayed') {
      continue;
    }

    progressiveScores.push(score);

    const status = calculateSegmentMatchPlayStatus({
      ...segment,
      holeScores: progressiveScores,
    });

    if (status.state === 'won' || status.state === 'halved') {
      continue;
    }

    if (!status.leader && status.completedHoles >= Math.ceil(status.totalHoles / 2)) {
      return `${segmentLabel} is all square after H${score.hole_number}.`;
    }

    if (status.leader && status.margin === 1 && status.holesRemaining <= 3) {
      const leaderLabel = getSegmentSideLabel(segment, status.leader, players);
      const holeLabel = status.holesRemaining === 1 ? 'hole' : 'holes';

      oneUpFallback ??= `${segmentLabel} is tight: ${leaderLabel} 1 up with ${status.holesRemaining} ${holeLabel} to play.`;
    }
  }

  return oneUpFallback;
}

function getEarlyWinHighlight(
  fixture: FixtureView,
  segment: FixtureView['segments'][number],
  players: PlayerRow[]
): string | null {
  const progressiveScores: FixtureView['segments'][number]['holeScores'] = [];

  for (const score of [...segment.holeScores].sort((a, b) => a.hole_number - b.hole_number)) {
    if (score.outcome === 'unplayed') {
      continue;
    }

    progressiveScores.push(score);

    const status = calculateSegmentMatchPlayStatus({
      ...segment,
      holeScores: progressiveScores,
    });

    if (status.state === 'won' && status.holesRemaining > 0 && status.leader) {
      const winnerLabel = getSegmentSideLabel(segment, status.leader, players);
      const segmentLabel = segment.name ?? fixture.name ?? 'the match';

      return `${winnerLabel} closed out ${segmentLabel} ${status.margin} & ${status.holesRemaining}.`;
    }
  }

  return null;
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

function getSegmentSideLabel(
  segment: FixtureView['segments'][number],
  team: Team,
  players: PlayerRow[]
): string {
  if (segment.kind !== 'singles') {
    return team;
  }

  const playerId = team === 'USA' ? segment.usa_player_id : segment.europe_player_id;
  const player = playerId ? players.find((candidate) => candidate.id === playerId) : null;

  return player?.name ?? team;
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
