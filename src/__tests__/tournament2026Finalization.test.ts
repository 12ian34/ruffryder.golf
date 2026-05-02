import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTournamentFinalizationDraft } from '../domain/2026/finalization';
import {
  completeTournament2026,
  reopenTournament2026,
  type FixtureView,
  type PlayerRow,
} from '../services/tournament2026Queries';
import type { Database } from '../types/supabase';

describe('2026 tournament finalization', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports missing expected hole scores before deriving stats', () => {
    const draft = buildTournamentFinalizationDraft({
      tournament,
      players,
      completedAt,
      fixtures: [
        {
          name: 'Group 1',
          sort_order: 0,
          segments: [
            {
              kind: 'foursomes',
              name: 'Front 9',
              hole_start: 1,
              hole_end: 2,
              usa_player_id: null,
              europe_player_id: null,
              holeScores: [{ hole_number: 1, usa_score: 4, europe_score: 5, outcome: 'USA' }],
            },
          ],
        },
      ],
    });

    expect(draft.missingScores).toEqual(['Group 1 / Front 9 / H2']);
    expect(draft.stats).toEqual([]);
  });

  it('derives player stats and CPI from back-nine singles only', () => {
    const draft = buildTournamentFinalizationDraft({
      tournament,
      players,
      completedAt,
      fixtures: [
        {
          name: 'Group 1',
          sort_order: 0,
          segments: [
            {
              kind: 'foursomes',
              name: 'Front 9',
              hole_start: 1,
              hole_end: 1,
              usa_player_id: null,
              europe_player_id: null,
              holeScores: [{ hole_number: 1, usa_score: 9, europe_score: 9, outcome: 'halved' }],
            },
            {
              kind: 'singles',
              name: 'Singles A',
              hole_start: 10,
              hole_end: 10,
              usa_player_id: 'usa-1',
              europe_player_id: 'europe-1',
              holeScores: [{ hole_number: 10, usa_score: 5, europe_score: 4, outcome: 'EUROPE' }],
            },
          ],
        },
      ],
    });

    expect(draft.missingScores).toEqual([]);
    expect(draft.stats).toMatchObject([
      {
        player_id: 'usa-1',
        singles_holes_played: 1,
        singles_strokes: 5,
        singles_average: 5,
        holes_won: 0,
        cpi_after: 90,
      },
      {
        player_id: 'europe-1',
        singles_holes_played: 1,
        singles_strokes: 4,
        singles_average: 4,
        holes_won: 1,
        cpi_after: 72,
      },
    ]);
    expect(draft.playerCpiUpdates).toEqual([
      { playerId: 'usa-1', currentCpi: 90 },
      { playerId: 'europe-1', currentCpi: 72 },
    ]);
    expect(draft.stats).toMatchObject([
      { legacy_payload: { cpi_before: 88 } },
      { legacy_payload: { cpi_before: 77 } },
    ]);
  });

  it('writes stats and CPI before marking the tournament complete', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(completedAt));

    const deleteSourceEq = vi.fn().mockResolvedValue({ error: null });
    const deleteTournamentEq = vi.fn(() => ({ eq: deleteSourceEq }));
    const deleteRows = vi.fn(() => ({ eq: deleteTournamentEq }));
    const insertStats = vi.fn().mockResolvedValue({ error: null });
    const playerEq = vi.fn().mockResolvedValue({ error: null });
    const updatePlayer = vi.fn(() => ({ eq: playerEq }));
    const tournamentEq = vi.fn().mockResolvedValue({ error: null });
    const updateTournament = vi.fn(() => ({ eq: tournamentEq }));
    const from = vi.fn((table: string) => {
      if (table === 'player_tournament_stats') {
        return { delete: deleteRows, insert: insertStats };
      }

      if (table === 'players') {
        return { update: updatePlayer };
      }

      return { update: updateTournament };
    });

    await completeTournament2026(
      {
        tournament,
        players,
        fixtures: completedFixtures,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(deleteTournamentEq).toHaveBeenCalledWith('tournament_id', 'tournament-1');
    expect(deleteSourceEq).toHaveBeenCalledWith('source', 'app');
    expect(insertStats).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ player_id: 'usa-1', cpi_after: 90 }),
        expect.objectContaining({ player_id: 'europe-1', cpi_after: 72 }),
      ])
    );
    expect(updatePlayer).toHaveBeenCalledWith({ current_cpi: 90 });
    expect(updatePlayer).toHaveBeenCalledWith({ current_cpi: 72 });
    expect(updateTournament).toHaveBeenCalledWith({ is_complete: true, completed_at: completedAt });
    expect(tournamentEq).toHaveBeenCalledWith('id', 'tournament-1');
  });

  it('reopens a tournament by restoring CPI, removing generated stats, and unlocking last', async () => {
    const selectSourceEq = vi.fn().mockResolvedValue({
      data: [
        {
          player_id: 'usa-1',
          legacy_payload: { cpi_before: 88 },
        },
        {
          player_id: 'europe-1',
          legacy_payload: { cpi_before: null },
        },
      ],
      error: null,
    });
    const selectTournamentEq = vi.fn(() => ({ eq: selectSourceEq }));
    const selectRows = vi.fn(() => ({ eq: selectTournamentEq }));
    const playerEq = vi.fn().mockResolvedValue({ error: null });
    const updatePlayer = vi.fn(() => ({ eq: playerEq }));
    const deleteSourceEq = vi.fn().mockResolvedValue({ error: null });
    const deleteTournamentEq = vi.fn(() => ({ eq: deleteSourceEq }));
    const deleteRows = vi.fn(() => ({ eq: deleteTournamentEq }));
    const tournamentEq = vi.fn().mockResolvedValue({ error: null });
    const updateTournament = vi.fn(() => ({ eq: tournamentEq }));
    const from = vi.fn((table: string) => {
      if (table === 'player_tournament_stats') {
        return { select: selectRows, delete: deleteRows };
      }

      if (table === 'players') {
        return { update: updatePlayer };
      }

      return { update: updateTournament };
    });

    await reopenTournament2026(
      {
        tournament: { ...tournament, is_complete: true },
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(updatePlayer).toHaveBeenCalledWith({ current_cpi: 88 });
    expect(updatePlayer).toHaveBeenCalledWith({ current_cpi: null });
    expect(deleteTournamentEq).toHaveBeenCalledWith('tournament_id', 'tournament-1');
    expect(deleteSourceEq).toHaveBeenCalledWith('source', 'app');
    expect(updateTournament).toHaveBeenCalledWith({ is_complete: false, completed_at: null });
    expect(tournamentEq).toHaveBeenCalledWith('id', 'tournament-1');
  });
});

const completedAt = '2026-06-06T18:00:00.000Z';

const tournament = {
  id: 'tournament-1',
  year: 2026,
  is_complete: false,
} as Database['public']['Tables']['tournaments']['Row'];

const players = [
  { id: 'usa-1', name: 'Ian', team: 'USA', current_cpi: 88 },
  { id: 'europe-1', name: 'Tom', team: 'EUROPE', current_cpi: 77 },
] as PlayerRow[];

const completedFixtures = [
  {
    name: 'Group 1',
    sort_order: 0,
    segments: [
      {
        kind: 'foursomes',
        name: 'Front 9',
        hole_start: 1,
        hole_end: 1,
        usa_player_id: null,
        europe_player_id: null,
        holeScores: [{ hole_number: 1, usa_score: 4, europe_score: 5, outcome: 'USA' }],
      },
      {
        kind: 'singles',
        name: 'Singles A',
        hole_start: 10,
        hole_end: 10,
        usa_player_id: 'usa-1',
        europe_player_id: 'europe-1',
        holeScores: [{ hole_number: 10, usa_score: 5, europe_score: 4, outcome: 'EUROPE' }],
      },
    ],
  },
] as unknown as FixtureView[];
