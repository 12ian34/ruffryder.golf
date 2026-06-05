import { describe, expect, it } from 'vitest';
import {
  buildAiRecapPrompt,
  buildAiRecapRequestBody,
  buildAiRecapSnapshot,
} from '../features/tournament2026/aiRecap';
import type {
  FixtureView,
  HoleScoreView,
  PlayerRow,
  TournamentRow,
} from '../services/tournament2026Queries';

const timestamp = '2026-05-03T12:00:00.000Z';

describe('2026 AI recap helpers', () => {
  it('compacts live tournament data into a bounded score snapshot', () => {
    const snapshot = buildAiRecapSnapshot({
      tournament,
      fixtures: [fixture],
      players,
      courseHoles: [{ holeNumber: 10, strokeIndex: 6, par: 3, yardage: 390 }],
      generatedAt: timestamp,
    });

    expect(snapshot).toMatchObject({
      version: 1,
      generatedAt: timestamp,
      tournament: {
        name: 'Ruff Ryders Cup',
        year: 2026,
        isComplete: false,
        cpiThreshold: 7,
      },
      totals: {
        overall: { USA: 1, EUROPE: 1, halved: 1, unplayed: 0 },
        singles: { USA: 1, EUROPE: 1, halved: 1, unplayed: 0 },
      },
      scoreboard: {
        pointsOnTable: {
          overall: { USA: 0, EUROPE: 0 },
        },
        provisionalPoints: {
          overall: { USA: 0.5, EUROPE: 0.5 },
        },
      },
      momentum: {
        holesWon: {
          overall: { USA: 1, EUROPE: 1, halved: 1, unplayed: 0 },
        },
      },
    });
    expect(snapshot.highlights).toContain('Ian birdied H10.');
    expect(snapshot.recentMovement).toHaveLength(3);
    expect(snapshot.fixtures[0]).toMatchObject({
      name: 'Match 1',
      progress: '3/9 holes (33%)',
    });
    expect(snapshot.fixtures[0].segments[0]).toMatchObject({
      kind: 'Singles Match',
      matchup: 'Ian vs Tommy',
      status: 'All square',
      recentHoles: [
        'H10: 2-5 (Ian won)',
        'H11: 4-4 (halved)',
        'H12: 6-5 (Tommy won)',
      ],
    });
  });

  it('uses a calm fallback when no score drama exists yet', () => {
    const snapshot = buildAiRecapSnapshot({
      tournament,
      fixtures: [],
      players,
      courseHoles: [],
      generatedAt: timestamp,
    });

    expect(snapshot.highlights).toEqual([
      'No wild highlights yet. Save more scores and this reel will fill in.',
    ]);
    expect(snapshot.recentMovement).toEqual([]);
    expect(snapshot.totals.overall).toEqual({ USA: 0, EUROPE: 0, halved: 0, unplayed: 0 });
    expect(snapshot.scoreboard.provisionalPoints.overall).toEqual({ USA: 0, EUROPE: 0 });
    expect(snapshot.momentum.holesWon.overall).toEqual({ USA: 0, EUROPE: 0, halved: 0, unplayed: 0 });
  });

  it('builds a server request and prompt without leaking auth fields', () => {
    const snapshot = buildAiRecapSnapshot({
      tournament,
      fixtures: [fixture],
      players,
      courseHoles: [],
      generatedAt: timestamp,
    });
    const request = buildAiRecapRequestBody(snapshot);
    const prompt = buildAiRecapPrompt(snapshot);

    expect(request).toEqual({ snapshot });
    expect(prompt).toContain('Write a live Ruff Ryders Cup tournament recap');
    expect(prompt).toContain('concise Markdown');
    expect(prompt).toContain('headings, bold emphasis, bullets, and numbered lists are allowed');
    expect(prompt).toContain('Emojis: allowed sparingly');
    expect(prompt).toContain('"fixtures"');
    expect(prompt).not.toContain('email');
    expect(prompt).not.toContain('access_token');
  });
});

const tournament: TournamentRow = {
  completed_at: null,
  cpi_threshold: 7,
  created_at: timestamp,
  id: 'tournament-1',
  is_active: true,
  is_complete: false,
  legacy_firebase_id: null,
  name: 'Ruff Ryders Cup',
  updated_at: timestamp,
  year: 2026,
};

const players: PlayerRow[] = [
  createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', currentCpi: 82 }),
  createPlayer({ id: 'europe-1', name: 'Tommy', team: 'EUROPE', currentCpi: 83 }),
];

const fixture: FixtureView = {
  created_at: timestamp,
  id: 'fixture-1',
  name: 'Match 1',
  sort_order: 0,
  status: 'in_progress',
  tournament_id: 'tournament-1',
  updated_at: timestamp,
  participants: [],
  segments: [
    {
      cpi_enabled: true,
      created_at: timestamp,
      europe_player_id: 'europe-1',
      fixture_id: 'fixture-1',
      hole_end: 18,
      hole_start: 10,
      id: 'segment-1',
      kind: 'singles',
      name: null,
      sort_order: 0,
      updated_at: timestamp,
      usa_player_id: 'usa-1',
      players: [],
      holeScores: [
        createHoleScore({ id: 'score-1', holeNumber: 10, usaScore: 2, europeScore: 5, outcome: 'USA' }),
        createHoleScore({ id: 'score-2', holeNumber: 11, usaScore: 4, europeScore: 4, outcome: 'halved' }),
        createHoleScore({ id: 'score-3', holeNumber: 12, usaScore: 6, europeScore: 5, outcome: 'EUROPE' }),
      ],
    },
  ],
};

function createPlayer({
  id,
  name,
  team,
  currentCpi,
}: {
  id: string;
  name: string;
  team: PlayerRow['team'];
  currentCpi: number;
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

function createHoleScore({
  id,
  holeNumber,
  usaScore,
  europeScore,
  outcome,
}: {
  id: string;
  holeNumber: number;
  usaScore: number;
  europeScore: number;
  outcome: HoleScoreView['outcome'];
}): HoleScoreView {
  return {
    cpi_applied: false,
    cpi_difference: 0,
    cpi_strokes_europe: 0,
    cpi_strokes_usa: 0,
    created_at: timestamp,
    europe_net_score: europeScore,
    europe_score: europeScore,
    hole_number: holeNumber,
    id,
    outcome,
    segment_id: 'segment-1',
    stroke_index: 6,
    updated_at: timestamp,
    updated_by: null,
    updatedByProfile: null,
    usa_net_score: usaScore,
    usa_score: usaScore,
  };
}
