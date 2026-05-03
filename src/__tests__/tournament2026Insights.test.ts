import { describe, expect, it } from 'vitest';
import { buildProgressTimeline, generateTournamentHighlights } from '../features/tournament2026/insights';
import type { FixtureView, PlayerRow } from '../services/tournament2026Queries';

const players = [
  createPlayer('usa-1', 'Ian', 'USA', 20),
  createPlayer('europe-1', 'Tommy', 'EUROPE', 10),
] satisfies PlayerRow[];

describe('2026 tournament insights', () => {
  it('builds score movement from saved hole updates', () => {
    const timeline = buildProgressTimeline([createFixture()]);

    expect(timeline).toEqual([
      expect.objectContaining({ label: 'Fixture 1 H1', usa: 1, europe: 0, halved: 0 }),
      expect.objectContaining({ label: 'Fixture 1 H2', usa: 1, europe: 0, halved: 1 }),
      expect.objectContaining({ label: 'Fixture 1 H3', usa: 1, europe: 1, halved: 1 }),
    ]);
  });

  it('generates highlights from 2026 match-play scores', () => {
    const highlights = generateTournamentHighlights({
      tournament: null,
      fixtures: [createFixture()],
      players,
      courseHoles: [
        { holeNumber: 1, strokeIndex: 1, par: 4, yardage: 400 },
        { holeNumber: 2, strokeIndex: 2, par: 3, yardage: 150 },
        { holeNumber: 3, strokeIndex: 3, par: 5, yardage: 500 },
      ],
    });

    expect(highlights).toContain('Ian took 7 on H3.');
    expect(highlights).toContain('Tommy birdied H1.');
  });
});

function createFixture(): FixtureView {
  return {
    id: 'fixture-1',
    tournament_id: 'tournament-1',
    name: 'Fixture 1',
    sort_order: 0,
    status: 'not_started',
    created_at: '2026-05-03T07:00:00.000Z',
    updated_at: '2026-05-03T07:00:00.000Z',
    participants: [],
    segments: [
      {
        id: 'segment-1',
        fixture_id: 'fixture-1',
        kind: 'singles',
        name: 'Singles A',
        hole_start: 1,
        hole_end: 3,
        sort_order: 1,
        cpi_enabled: true,
        usa_player_id: 'usa-1',
        europe_player_id: 'europe-1',
        created_at: '2026-05-03T07:00:00.000Z',
        updated_at: '2026-05-03T07:00:00.000Z',
        players: [],
        holeScores: [
          createScore('score-1', 1, 4, 3, 'USA', '2026-05-03T07:01:00.000Z'),
          createScore('score-2', 2, 3, 3, 'halved', '2026-05-03T07:02:00.000Z'),
          createScore('score-3', 3, 7, 5, 'EUROPE', '2026-05-03T07:03:00.000Z'),
        ],
      },
    ],
  };
}

function createPlayer(
  id: string,
  name: string,
  team: PlayerRow['team'],
  currentCpi: number
): PlayerRow {
  return {
    id,
    legacy_firebase_id: null,
    name,
    team,
    current_cpi: currentCpi,
    custom_emoji: null,
    created_at: '2026-05-03T07:00:00.000Z',
    updated_at: '2026-05-03T07:00:00.000Z',
  };
}

function createScore(
  id: string,
  holeNumber: number,
  usaScore: number,
  europeScore: number,
  outcome: FixtureView['segments'][number]['holeScores'][number]['outcome'],
  updatedAt: string
): FixtureView['segments'][number]['holeScores'][number] {
  return {
    id,
    segment_id: 'segment-1',
    hole_number: holeNumber,
    stroke_index: holeNumber,
    usa_score: usaScore,
    europe_score: europeScore,
    usa_net_score: usaScore,
    europe_net_score: europeScore,
    outcome,
    cpi_applied: false,
    cpi_difference: 0,
    cpi_strokes_usa: 0,
    cpi_strokes_europe: 0,
    updated_by: null,
    created_at: updatedAt,
    updated_at: updatedAt,
    updatedByProfile: null,
  };
}
