import type { FixtureView, SegmentView } from '../../services/tournament2026Queries';
import { calculateSegmentMatchPlayStatus } from './matchPlayStatus';

type Team = 'USA' | 'EUROPE';

export interface TeamPoints {
  USA: number;
  EUROPE: number;
}

export interface PointsBreakdown {
  overall: TeamPoints;
  foursomes: TeamPoints;
  singles: TeamPoints;
  strokePlay: TeamPoints;
}

export interface PointsTotals {
  onTable: PointsBreakdown;
  provisional: PointsBreakdown;
  hasOneVOne: boolean;
}

export function isOneVOneFixture(fixture: FixtureView): boolean {
  if (fixture.segments.length !== 1) return false;
  const [segment] = fixture.segments;
  return segment.kind === 'singles' && segment.hole_start === 1 && segment.hole_end === 18;
}

export function foursomesPlayerCount(segment: SegmentView): number {
  const usa = segment.players.filter((player) => player.team === 'USA').length;
  const europe = segment.players.filter((player) => player.team === 'EUROPE').length;
  return Math.min(usa, europe) || 2;
}

export interface SegmentPointResult {
  matchPlayOnTable: TeamPoints;
  matchPlayProvisional: TeamPoints;
  strokePlayOnTable: TeamPoints | null;
  strokePlayProvisional: TeamPoints | null;
}

export function calculateSegmentPoints(
  segment: SegmentView,
  options: { isOneVOneFixture: boolean }
): SegmentPointResult {
  const status = calculateSegmentMatchPlayStatus(segment);
  const playersPerSide = segment.kind === 'foursomes' ? foursomesPlayerCount(segment) : 1;

  let matchPlayOnTable: TeamPoints = { USA: 0, EUROPE: 0 };
  let matchPlayProvisional: TeamPoints = { USA: 0, EUROPE: 0 };

  if (status.state === 'won' && status.leader) {
    matchPlayOnTable = teamPoints(status.leader, playersPerSide);
    matchPlayProvisional = teamPoints(status.leader, playersPerSide);
  } else if (status.state === 'halved') {
    const halved = halvedPoints(playersPerSide);
    matchPlayOnTable = halved;
    matchPlayProvisional = halved;
  } else if (status.state === 'dormie' && status.leader) {
    matchPlayProvisional = teamPoints(status.leader, playersPerSide);
  } else if (status.state === 'in_progress') {
    matchPlayProvisional = status.leader
      ? teamPoints(status.leader, playersPerSide)
      : halvedPoints(playersPerSide);
  }

  let strokePlayOnTable: TeamPoints | null = null;
  let strokePlayProvisional: TeamPoints | null = null;

  if (options.isOneVOneFixture && segment.kind === 'singles') {
    const result = calculateSegmentStrokePlay(segment);
    strokePlayOnTable = result.onTable;
    strokePlayProvisional = result.provisional;
  }

  return { matchPlayOnTable, matchPlayProvisional, strokePlayOnTable, strokePlayProvisional };
}

function calculateSegmentStrokePlay(segment: SegmentView): {
  onTable: TeamPoints;
  provisional: TeamPoints;
} {
  const useNet = segment.cpi_enabled;
  const totalHoles = segment.hole_end - segment.hole_start + 1;
  let usaTotal = 0;
  let europeTotal = 0;
  let scoredHoles = 0;

  for (const score of segment.holeScores) {
    if (score.outcome === 'unplayed') continue;
    const usa = useNet ? score.usa_net_score ?? score.usa_score : score.usa_score;
    const europe = useNet ? score.europe_net_score ?? score.europe_score : score.europe_score;
    if (usa === null || europe === null) continue;
    usaTotal += usa;
    europeTotal += europe;
    scoredHoles += 1;
  }

  if (scoredHoles === 0) {
    return { onTable: { USA: 0, EUROPE: 0 }, provisional: { USA: 0, EUROPE: 0 } };
  }

  const provisional = strokesToPoints(usaTotal, europeTotal);
  const onTable = scoredHoles === totalHoles ? provisional : { USA: 0, EUROPE: 0 };
  return { onTable, provisional };
}

function strokesToPoints(usa: number, europe: number): TeamPoints {
  if (usa < europe) return { USA: 1, EUROPE: 0 };
  if (europe < usa) return { USA: 0, EUROPE: 1 };
  return { USA: 0.5, EUROPE: 0.5 };
}

function teamPoints(team: Team, value: number): TeamPoints {
  return team === 'USA' ? { USA: value, EUROPE: 0 } : { USA: 0, EUROPE: value };
}

function halvedPoints(playersPerSide: number): TeamPoints {
  const half = playersPerSide * 0.5;
  return { USA: half, EUROPE: half };
}

export function calculateFixturePoints(fixture: FixtureView): {
  onTable: PointsBreakdown;
  provisional: PointsBreakdown;
  isOneVOne: boolean;
} {
  const isOneVOne = isOneVOneFixture(fixture);
  const onTable = createEmptyBreakdown();
  const provisional = createEmptyBreakdown();

  for (const segment of fixture.segments) {
    const result = calculateSegmentPoints(segment, { isOneVOneFixture: isOneVOne });
    const bucket = segment.kind === 'foursomes' ? 'foursomes' : 'singles';

    addInto(onTable[bucket], result.matchPlayOnTable);
    addInto(provisional[bucket], result.matchPlayProvisional);
    addInto(onTable.overall, result.matchPlayOnTable);
    addInto(provisional.overall, result.matchPlayProvisional);

    if (result.strokePlayOnTable) {
      addInto(onTable.strokePlay, result.strokePlayOnTable);
      addInto(onTable.overall, result.strokePlayOnTable);
    }
    if (result.strokePlayProvisional) {
      addInto(provisional.strokePlay, result.strokePlayProvisional);
      addInto(provisional.overall, result.strokePlayProvisional);
    }
  }

  return { onTable, provisional, isOneVOne };
}

export function calculatePointTotals(fixtures: FixtureView[]): PointsTotals {
  const onTable = createEmptyBreakdown();
  const provisional = createEmptyBreakdown();
  let hasOneVOne = false;

  for (const fixture of fixtures) {
    const fixturePoints = calculateFixturePoints(fixture);
    if (fixturePoints.isOneVOne) hasOneVOne = true;
    mergeBreakdown(onTable, fixturePoints.onTable);
    mergeBreakdown(provisional, fixturePoints.provisional);
  }

  return { onTable, provisional, hasOneVOne };
}

function createEmptyBreakdown(): PointsBreakdown {
  return {
    overall: { USA: 0, EUROPE: 0 },
    foursomes: { USA: 0, EUROPE: 0 },
    singles: { USA: 0, EUROPE: 0 },
    strokePlay: { USA: 0, EUROPE: 0 },
  };
}

function addInto(target: TeamPoints, source: TeamPoints): void {
  target.USA += source.USA;
  target.EUROPE += source.EUROPE;
}

function mergeBreakdown(target: PointsBreakdown, source: PointsBreakdown): void {
  addInto(target.overall, source.overall);
  addInto(target.foursomes, source.foursomes);
  addInto(target.singles, source.singles);
  addInto(target.strokePlay, source.strokePlay);
}
