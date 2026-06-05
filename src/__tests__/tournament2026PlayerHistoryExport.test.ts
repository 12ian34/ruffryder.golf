import { describe, expect, it } from 'vitest';
import {
  buildPlayerHistoryCsv,
  createPlayerHistoryExportFilename,
} from '../features/tournament2026/playerHistoryExport';
import type { PlayerRow, PlayerTournamentStatsRow, Team } from '../services/tournament2026Queries';

describe('2026 player history export', () => {
  it('builds a wide year-by-year CSV for every player', () => {
    const csv = buildPlayerHistoryCsv(
      [
        createPlayer({ id: 'europe-1', name: 'Bob, Jr', team: 'EUROPE', current_cpi: null }),
        createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA', current_cpi: 7.2 }),
      ],
      [
        createStat({
          id: 'stat-2025',
          player_id: 'usa-1',
          completion_year: 2025,
          source: 'legacy',
          legacy_payload: {
            score: 55,
            scoreAdjusted: 48,
            pointsEarned: 1,
            pointsEarnedAdjusted: 2,
            holesWon: 7,
          },
        }),
        createStat({
          id: 'stat-2026',
          player_id: 'usa-1',
          completion_year: 2026,
          source: 'app',
          singles_average: 3.4,
          holes_won: 5,
          cpi_after: 6.8,
        }),
      ]
    );

    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      [
        'player_id',
        'player_name',
        'team',
        'tier',
        'current_cpi',
        'history_row_count',
        '2026_raw_score',
        '2026_legacy_adjusted_score',
        '2026_raw_points',
        '2026_legacy_adjusted_points',
        '2026_holes_won',
        '2026_cpi_after',
        '2026_source',
        '2026_completed_at',
        '2025_raw_score',
        '2025_legacy_adjusted_score',
        '2025_raw_points',
        '2025_legacy_adjusted_points',
        '2025_holes_won',
        '2025_cpi_after',
        '2025_source',
        '2025_completed_at',
      ].join(',')
    );
    expect(lines[1]).toContain('usa-1,Ian,USA,2,7.2,2,3.4,6.8,,,5,6.8,app,2026-06-05T12:00:00.000Z');
    expect(lines[1]).toContain('55,48,1,2,7,,legacy,2026-06-05T12:00:00.000Z');
    expect(lines[2]).toContain('europe-1,"Bob, Jr",EUROPE,2,,0');
  });

  it('preserves duplicate player-year entries in one cell', () => {
    const csv = buildPlayerHistoryCsv(
      [createPlayer({ id: 'usa-1', name: 'Ian', team: 'USA' })],
      [
        createStat({
          id: 'older',
          player_id: 'usa-1',
          completion_year: 2026,
          singles_strokes: 31,
          completed_at: '2026-01-01T12:00:00.000Z',
        }),
        createStat({
          id: 'newer',
          player_id: 'usa-1',
          completion_year: 2026,
          singles_strokes: 29,
          completed_at: '2026-06-05T12:00:00.000Z',
        }),
      ]
    );

    expect(csv.split('\n')[1]).toContain('29 | 31');
    expect(csv.split('\n')[1]).toContain('2026-06-05T12:00:00.000Z | 2026-01-01T12:00:00.000Z');
  });

  it('creates dated export filenames', () => {
    expect(createPlayerHistoryExportFilename(new Date('2026-06-05T12:00:00.000Z'))).toBe(
      'ruff-ryders-player-history-2026-06-05.csv'
    );
  });
});

function createPlayer({
  id,
  name,
  team,
  current_cpi = null,
}: {
  id: string;
  name: string;
  team: Team;
  current_cpi?: number | null;
}): PlayerRow {
  return {
    created_at: '2026-06-05T12:00:00.000Z',
    current_cpi,
    custom_emoji: null,
    id,
    legacy_firebase_id: null,
    name,
    team,
    tier: 2,
    updated_at: '2026-06-05T12:00:00.000Z',
  };
}

function createStat(overrides: Partial<PlayerTournamentStatsRow>): PlayerTournamentStatsRow {
  return {
    completed_at: '2026-06-05T12:00:00.000Z',
    completion_year: 2026,
    cpi_after: null,
    created_at: '2026-06-05T12:00:00.000Z',
    holes_halved: 0,
    holes_won: 0,
    id: 'stat',
    legacy_payload: null,
    player_id: 'usa-1',
    singles_average: null,
    singles_holes_played: 0,
    singles_strokes: 0,
    source: 'manual',
    tournament_id: null,
    ...overrides,
  };
}
