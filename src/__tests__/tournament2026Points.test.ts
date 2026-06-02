import { describe, expect, it } from 'vitest';
import {
  calculateFixturePoints,
  calculatePointTotals,
  calculateSegmentPoints,
} from '../domain/2026/points';
import type { FixtureView, SegmentView } from '../services/tournament2026Queries';

type Team = 'USA' | 'EUROPE';
type Outcome = 'USA' | 'EUROPE' | 'halved' | 'unplayed';

function createScore(
  holeNumber: number,
  outcome: Outcome,
  scores: { usa?: number; europe?: number; usaNet?: number; europeNet?: number } = {}
): SegmentView['holeScores'][number] {
  return {
    hole_number: holeNumber,
    outcome,
    usa_score: scores.usa ?? null,
    europe_score: scores.europe ?? null,
    usa_net_score: scores.usaNet ?? null,
    europe_net_score: scores.europeNet ?? null,
  } as SegmentView['holeScores'][number];
}

function createSegment(input: {
  id: string;
  kind: SegmentView['kind'];
  holeStart: number;
  holeEnd: number;
  outcomes: Outcome[];
  cpiEnabled?: boolean;
  players?: Team[];
  scores?: Array<{ usa?: number; europe?: number; usaNet?: number; europeNet?: number }>;
}): SegmentView {
  return {
    id: input.id,
    kind: input.kind,
    hole_start: input.holeStart,
    hole_end: input.holeEnd,
    cpi_enabled: input.cpiEnabled ?? false,
    holeScores: input.outcomes.map((outcome, index) =>
      createScore(input.holeStart + index, outcome, input.scores?.[index])
    ),
    players: (input.players ?? ['USA', 'EUROPE']).map((team, index) => ({
      id: `${input.id}-player-${index}`,
      team,
      player_id: `${team.toLowerCase()}-${index}`,
      player: null,
    })),
  } as unknown as SegmentView;
}

function createFixture(id: string, segments: SegmentView[]): FixtureView {
  return {
    id,
    segments,
    participants: [],
  } as unknown as FixtureView;
}

describe('2026 points allocation', () => {
  it('awards one total match-play point for a won front-nine foursomes match', () => {
    const result = calculateSegmentPoints(
      createSegment({
        id: 'front-9',
        kind: 'foursomes',
        holeStart: 1,
        holeEnd: 3,
        outcomes: ['USA', 'USA', 'halved'],
        players: ['USA', 'USA', 'EUROPE', 'EUROPE'],
      }),
      { isOneVOneFixture: false }
    );

    expect(result.matchPlayOnTable).toEqual({ USA: 1, EUROPE: 0 });
    expect(result.matchPlayProvisional).toEqual({ USA: 1, EUROPE: 0 });
  });

  it('halves a front-nine foursomes match as half a point per side', () => {
    const result = calculateSegmentPoints(
      createSegment({
        id: 'front-9-halved',
        kind: 'foursomes',
        holeStart: 1,
        holeEnd: 3,
        outcomes: ['USA', 'EUROPE', 'halved'],
        players: ['USA', 'USA', 'EUROPE', 'EUROPE'],
      }),
      { isOneVOneFixture: false }
    );

    expect(result.matchPlayOnTable).toEqual({ USA: 0.5, EUROPE: 0.5 });
    expect(result.matchPlayProvisional).toEqual({ USA: 0.5, EUROPE: 0.5 });
  });

  it('projects an in-progress all-square foursomes match as half a point per side', () => {
    const result = calculateSegmentPoints(
      createSegment({
        id: 'front-9-in-progress',
        kind: 'foursomes',
        holeStart: 1,
        holeEnd: 3,
        outcomes: ['USA', 'EUROPE'],
        players: ['USA', 'USA', 'EUROPE', 'EUROPE'],
      }),
      { isOneVOneFixture: false }
    );

    expect(result.matchPlayOnTable).toEqual({ USA: 0, EUROPE: 0 });
    expect(result.matchPlayProvisional).toEqual({ USA: 0.5, EUROPE: 0.5 });
  });

  it('totals a 4-player standard fixture as one foursomes point plus two singles points', () => {
    const fixture = createFixture('standard-4', [
      createSegment({
        id: 'front-9',
        kind: 'foursomes',
        holeStart: 1,
        holeEnd: 3,
        outcomes: ['USA', 'USA', 'halved'],
        players: ['USA', 'USA', 'EUROPE', 'EUROPE'],
      }),
      createSegment({
        id: 'singles-1',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 12,
        outcomes: ['USA', 'USA', 'halved'],
      }),
      createSegment({
        id: 'singles-2',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 12,
        outcomes: ['EUROPE', 'EUROPE', 'halved'],
      }),
    ]);

    const result = calculateFixturePoints(fixture);

    expect(result.onTable).toMatchObject({
      overall: { USA: 2, EUROPE: 1 },
      foursomes: { USA: 1, EUROPE: 0 },
      singles: { USA: 1, EUROPE: 1 },
      strokePlay: { USA: 0, EUROPE: 0 },
    });
    expect(result.provisional).toEqual(result.onTable);
  });

  it('totals a 6-player flexible fixture as one foursomes point plus three singles points', () => {
    const fixture = createFixture('flexible-6', [
      createSegment({
        id: 'front-9',
        kind: 'foursomes',
        holeStart: 1,
        holeEnd: 3,
        outcomes: ['USA', 'USA', 'halved'],
        players: ['USA', 'USA', 'EUROPE', 'EUROPE'],
      }),
      createSegment({
        id: 'singles-1',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 12,
        outcomes: ['USA', 'USA', 'halved'],
      }),
      createSegment({
        id: 'singles-2',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 12,
        outcomes: ['EUROPE', 'EUROPE', 'halved'],
      }),
      createSegment({
        id: 'singles-3',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 12,
        outcomes: ['halved', 'USA', 'EUROPE'],
      }),
    ]);

    const result = calculatePointTotals([fixture]);

    expect(result.onTable).toMatchObject({
      overall: { USA: 2.5, EUROPE: 1.5 },
      foursomes: { USA: 1, EUROPE: 0 },
      singles: { USA: 1.5, EUROPE: 1.5 },
      strokePlay: { USA: 0, EUROPE: 0 },
    });
    expect(result.provisional).toEqual(result.onTable);
  });

  it('keeps the extra stroke-play point for completed full-18 one-v-one fixtures', () => {
    const fixture = createFixture('full-18', [
      createSegment({
        id: 'full-18-singles',
        kind: 'singles',
        holeStart: 1,
        holeEnd: 18,
        outcomes: [
          'USA',
          'EUROPE',
          'USA',
          'halved',
          'USA',
          'EUROPE',
          'USA',
          'halved',
          'USA',
          'EUROPE',
          'USA',
          'halved',
          'USA',
          'EUROPE',
          'USA',
          'halved',
          'USA',
          'EUROPE',
        ],
        scores: Array.from({ length: 18 }, (_, index) =>
          index % 3 === 1 ? { usa: 4, europe: 3 } : { usa: 2, europe: 3 }
        ),
      }),
    ]);

    const result = calculateFixturePoints(fixture);

    expect(result.isOneVOne).toBe(true);
    expect(result.onTable).toMatchObject({
      overall: { USA: 2, EUROPE: 0 },
      singles: { USA: 1, EUROPE: 0 },
      strokePlay: { USA: 1, EUROPE: 0 },
    });
  });
});
