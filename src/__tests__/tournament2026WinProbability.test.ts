import { describe, expect, it } from 'vitest';
import { calculateWinProbability, type WinProbabilitySegmentInput } from '../domain/2026/winProbability';
import { buildWinProbabilityInput } from '../features/tournament2026/winProbability';
import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  TournamentRow,
} from '../services/tournament2026Queries';

describe('2026 win probability model', () => {
  it('stays close to neutral for early small leads', () => {
    const forecast = calculateWinProbability({
      segments: [
        createSegment({
          holeStart: 1,
          holeEnd: 18,
          holeScores: [score(1, 'USA')],
        }),
      ],
    });

    expect(forecast.currentScore).toEqual({ USA: 1, EUROPE: 0, halved: 0 });
    expect(forecast.remainingHoles).toBe(17);
    expect(forecast.probabilities.USA).toBeLessThan(0.7);
    expect(forecast.probabilities.EUROPE).toBeGreaterThan(0.2);
    expect(forecast.probabilities.tie).toBeGreaterThan(0.05);
  });

  it('swings strongly toward late leaders', () => {
    const forecast = calculateWinProbability({
      segments: [
        createSegment({
          holeStart: 1,
          holeEnd: 18,
          holeScores: [
            ...range(1, 8).map((holeNumber) => score(holeNumber, 'USA')),
            ...range(9, 15).map((holeNumber) => score(holeNumber, 'EUROPE')),
            score(16, 'halved'),
          ],
        }),
      ],
    });

    expect(forecast.currentScore).toEqual({ USA: 8, EUROPE: 7, halved: 1 });
    expect(forecast.remainingHoles).toBe(2);
    expect(forecast.probabilities.USA).toBeGreaterThan(0.6);
    expect(forecast.probabilities.EUROPE).toBeLessThan(0.25);
    expect(forecast.locked).toBe(false);
  });

  it('returns 100 percent when a side is mathematically locked', () => {
    const forecast = calculateWinProbability({
      segments: [
        createSegment({
          holeStart: 1,
          holeEnd: 9,
          holeScores: range(1, 5).map((holeNumber) => score(holeNumber, 'EUROPE')),
        }),
      ],
    });

    expect(forecast.locked).toBe(true);
    expect(forecast.probabilities).toEqual({ USA: 0, EUROPE: 1, tie: 0 });
  });

  it('keeps tournament ties represented', () => {
    const forecast = calculateWinProbability({
      segments: [
        createSegment({
          holeStart: 1,
          holeEnd: 3,
          holeScores: [score(1, 'USA'), score(2, 'EUROPE')],
        }),
      ],
    });

    expect(forecast.leader).toBeNull();
    expect(forecast.probabilities.tie).toBeGreaterThan(0.2);
  });

  it('uses CPI as a bounded singles-only nudge', () => {
    const base = calculateWinProbability({
      cpiThreshold: 7,
      segments: [
        createSegment({
          kind: 'singles',
          holeStart: 10,
          holeEnd: 18,
          usaPlayerCpi: 75,
          europePlayerCpi: 95,
        }),
      ],
    });
    const foursomes = calculateWinProbability({
      cpiThreshold: 7,
      segments: [
        createSegment({
          kind: 'foursomes',
          holeStart: 1,
          holeEnd: 9,
          usaPlayerCpi: 75,
          europePlayerCpi: 95,
        }),
      ],
    });

    expect(base.probabilities.USA).toBeGreaterThan(foursomes.probabilities.USA);
    expect(base.probabilities.USA - foursomes.probabilities.USA).toBeLessThan(0.12);
    expect(foursomes.probabilities.USA).toBeCloseTo(foursomes.probabilities.EUROPE, 5);
  });

  it('does not let closed segments contribute volatility', () => {
    const forecast = calculateWinProbability({
      segments: [
        createSegment({
          holeStart: 1,
          holeEnd: 9,
          holeScores: range(1, 5).map((holeNumber) => score(holeNumber, 'USA')),
        }),
      ],
    });

    expect(forecast.remainingHoles).toBe(0);
    expect(forecast.probabilities.USA).toBe(1);
  });
});

describe('2026 win probability adapter', () => {
  it('handles empty fixture data', () => {
    const input = buildWinProbabilityInput({
      fixtures: [],
      players: [],
      tournament: null,
    });

    expect(input).toEqual({ cpiThreshold: null, segments: [] });
    expect(calculateWinProbability(input).probabilities).toEqual({ USA: 0, EUROPE: 0, tie: 1 });
  });

  it('maps live fixtures without coupling model code to Supabase rows', () => {
    const input = buildWinProbabilityInput({
      fixtures: [fixture],
      players,
      tournament,
    });

    expect(input.cpiThreshold).toBe(7);
    expect(input.segments).toMatchObject([
      {
        id: 'segment-1',
        kind: 'singles',
        holeStart: 10,
        holeEnd: 18,
        cpiEnabled: true,
        usaPlayerCpi: 80,
        europePlayerCpi: 92,
        holeScores: [{ holeNumber: 10, outcome: 'USA' }],
      },
    ]);
  });
});

const players = [
  { id: 'usa-1', team: 'USA', current_cpi: 80 },
  { id: 'europe-1', team: 'EUROPE', current_cpi: 92 },
] as PlayerRow[];

const tournament = { id: 'tournament-1', cpi_threshold: 7 } as TournamentRow;

const fixture = {
  segments: [
    {
      id: 'segment-1',
      name: 'Singles A',
      kind: 'singles',
      hole_start: 10,
      hole_end: 18,
      cpi_enabled: true,
      usa_player_id: 'usa-1',
      europe_player_id: 'europe-1',
      holeScores: [{ hole_number: 10, outcome: 'USA' }],
    },
  ],
} as unknown as FixtureView;

function createSegment(overrides: Partial<WinProbabilitySegmentInput> = {}): WinProbabilitySegmentInput {
  return {
    id: 'segment-1',
    kind: 'singles',
    holeStart: 1,
    holeEnd: 18,
    cpiEnabled: true,
    usaPlayerCpi: null,
    europePlayerCpi: null,
    holeScores: [],
    ...overrides,
  };
}

function score(holeNumber: number, outcome: HoleScoreRow['outcome']) {
  return { holeNumber, outcome };
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
