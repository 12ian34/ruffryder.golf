import { describe, expect, it } from 'vitest';
import {
  calculateBackNineIndividualTotals,
  calculateCpiComparisons,
} from '../domain/2026/backNineTotals';
import type {
  HoleScoreView,
  PlayerRow,
  SegmentView,
} from '../services/tournament2026Queries';

const timestamp = '2026-06-06T00:00:00.000Z';

describe('calculateBackNineIndividualTotals', () => {
  it('returns one row per singles player, summing gross and net strokes for played holes', () => {
    const players = [
      createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 82 }),
      createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 92 }),
    ];
    const segment = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: true,
      holes: [
        // Tommy receives a stroke on hole 10 (CPI gap 10, threshold 7, stroke index 6).
        { holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 4, outcome: 'halved' },
        { holeNumber: 11, usaScore: 3, europeScore: 4, usaNetScore: 3, europeNetScore: 4, outcome: 'USA' },
        { holeNumber: 12, usaScore: 5, europeScore: 4, usaNetScore: 5, europeNetScore: 4, outcome: 'EUROPE' },
        // Unplayed hole is ignored.
        { holeNumber: 13, usaScore: null, europeScore: null, usaNetScore: null, europeNetScore: null, outcome: 'unplayed' },
      ],
    });

    const totals = calculateBackNineIndividualTotals([segment], players);

    expect(totals).toEqual([
      {
        playerId: 'usa-1',
        playerName: 'Ian',
        team: 'USA',
        currentCpi: 82,
        grossStrokes: 12,
        cpiStrokesReceived: 0,
        netStrokes: 12,
        holesPlayed: 3,
        cpiApplied: true,
      },
      {
        playerId: 'europe-1',
        playerName: 'Tommy',
        team: 'EUROPE',
        currentCpi: 92,
        grossStrokes: 13,
        cpiStrokesReceived: 1,
        netStrokes: 12,
        holesPlayed: 3,
        cpiApplied: true,
      },
    ]);
  });

  it('uses gross strokes for both gross and net when CPI is disabled on the segment', () => {
    const players = [
      createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 82 }),
      createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 92 }),
    ];
    const segment = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: false,
      holes: [
        { holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 4, outcome: 'EUROPE' },
        { holeNumber: 11, usaScore: 3, europeScore: 4, usaNetScore: 3, europeNetScore: 4, outcome: 'USA' },
      ],
    });

    const totals = calculateBackNineIndividualTotals([segment], players);

    expect(totals[0]).toMatchObject({ grossStrokes: 7, netStrokes: 7, cpiStrokesReceived: 0, cpiApplied: false });
    expect(totals[1]).toMatchObject({ grossStrokes: 9, netStrokes: 9, cpiStrokesReceived: 0, cpiApplied: false });
  });

  it('skips foursomes segments and unknown players', () => {
    const players = [createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 82 })];
    const foursomes = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: false,
      holes: [{ holeNumber: 1, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 5, outcome: 'EUROPE' }],
    });
    foursomes.kind = 'foursomes';
    const orphanSingles = createSinglesSegment({
      id: 'segment-2',
      usaPlayerId: 'missing',
      europePlayerId: 'missing',
      cpiEnabled: false,
      holes: [{ holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 5, outcome: 'EUROPE' }],
    });

    const totals = calculateBackNineIndividualTotals([foursomes, orphanSingles], players);

    expect(totals).toEqual([]);
  });
});

describe('calculateCpiComparisons', () => {
  it('doubles back 9 gross to 18 holes and diffs against CPI', () => {
    const players = [
      createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 82 }),
      createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 92 }),
    ];
    const segment = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: true,
      holes: [
        { holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 4, outcome: 'halved' },
        { holeNumber: 11, usaScore: 3, europeScore: 4, usaNetScore: 3, europeNetScore: 4, outcome: 'USA' },
        { holeNumber: 12, usaScore: 5, europeScore: 4, usaNetScore: 5, europeNetScore: 4, outcome: 'EUROPE' },
      ],
    });

    const comparisons = calculateCpiComparisons([segment], players);

    // Ian: gross 12 → projected 24, diff 24 − 82 = −58 (well under his index).
    expect(comparisons.find((row) => row.playerId === 'usa-1')).toEqual({
      playerId: 'usa-1',
      playerName: 'Ian',
      team: 'USA',
      currentCpi: 82,
      backNineGross: 12,
      holesPlayed: 3,
      projected: 24,
      diff: -58,
    });
    // Tommy: gross 13 → projected 26, diff 26 − 92 = −66.
    expect(comparisons.find((row) => row.playerId === 'europe-1')).toMatchObject({
      projected: 26,
      diff: -66,
    });
  });

  it('aggregates a player across multiple back 9 singles segments', () => {
    const players = [
      createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 80 }),
      createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 90 }),
      createPlayer({ id: 'europe-2', name: 'Rory', team: 'EUROPE', currentCpi: 88 }),
    ];
    const first = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: false,
      holes: [{ holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 5, outcome: 'EUROPE' }],
    });
    const second = createSinglesSegment({
      id: 'segment-2',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-2',
      cpiEnabled: false,
      holes: [{ holeNumber: 11, usaScore: 3, europeScore: 4, usaNetScore: 3, europeNetScore: 4, outcome: 'USA' }],
    });

    const ian = calculateCpiComparisons([first, second], players).find((row) => row.playerId === 'usa-1');

    expect(ian).toMatchObject({ backNineGross: 7, holesPlayed: 2, projected: 14 });
  });

  it('leaves diff null when the player has no CPI and skips players with no holes', () => {
    const players = [
      createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: null }),
      createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 90 }),
    ];
    const segment = createSinglesSegment({
      id: 'segment-1',
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-1',
      cpiEnabled: false,
      holes: [{ holeNumber: 10, usaScore: 4, europeScore: 5, usaNetScore: 4, europeNetScore: 5, outcome: 'EUROPE' }],
    });

    const comparisons = calculateCpiComparisons([segment], players);

    expect(comparisons.find((row) => row.playerId === 'usa-1')).toMatchObject({
      currentCpi: null,
      diff: null,
    });
  });
});

function createPlayer({
  id,
  name,
  team,
  currentCpi,
}: {
  id: string;
  name: string;
  team: PlayerRow['team'];
  currentCpi: number | null;
}): PlayerRow {
  return {
    created_at: timestamp,
    current_cpi: currentCpi,
    custom_emoji: null,
    id,
    legacy_firebase_id: null,
    name,
    team,
    tier: 2,
    updated_at: timestamp,
  };
}

function createSinglesSegment({
  id,
  usaPlayerId,
  europePlayerId,
  cpiEnabled,
  holes,
}: {
  id: string;
  usaPlayerId: string;
  europePlayerId: string;
  cpiEnabled: boolean;
  holes: Array<{
    holeNumber: number;
    usaScore: number | null;
    europeScore: number | null;
    usaNetScore: number | null;
    europeNetScore: number | null;
    outcome: HoleScoreView['outcome'];
  }>;
}): SegmentView {
  return {
    cpi_enabled: cpiEnabled,
    created_at: timestamp,
    europe_player_id: europePlayerId,
    fixture_id: 'fixture-1',
    hole_end: 18,
    hole_start: 10,
    id,
    kind: 'singles',
    name: null,
    sort_order: 0,
    updated_at: timestamp,
    usa_player_id: usaPlayerId,
    players: [],
    holeScores: holes.map((hole) => ({
      cpi_applied: false,
      cpi_difference: 0,
      cpi_strokes_europe: 0,
      cpi_strokes_usa: 0,
      created_at: timestamp,
      europe_net_score: hole.europeNetScore,
      europe_score: hole.europeScore,
      hole_number: hole.holeNumber,
      id: `${id}-h${hole.holeNumber}`,
      outcome: hole.outcome,
      segment_id: id,
      stroke_index: 6,
      updated_at: timestamp,
      updated_by: null,
      updatedByProfile: null,
      usa_net_score: hole.usaNetScore,
      usa_score: hole.usaScore,
    })),
  };
}
