import { describe, expect, it, vi } from 'vitest';
import { filterFixturesForScoreEntry } from '../features/tournament2026/viewUtils';
import {
  clearFixtureScores2026,
  clearHoleScore2026,
  createOwnProfile,
  deleteFixture2026,
  fetchTournament2026Data,
  updateCourseHole2026,
  updateFixture2026,
  updatePlayer2026,
  updateProfilePlayerLink2026,
  updateSegment2026,
  updateTournament2026,
  type FixtureView,
  type PlayerRow,
  type ProfileRow,
} from '../services/tournament2026Queries';
import type { Database } from '../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('2026 score permissions', () => {
  it('shows all score fixtures to admins', () => {
    expect(filterFixturesForScoreEntry(fixtures, adminProfile)).toHaveLength(2);
  });

  it('shows only linked-player fixtures to non-admins', () => {
    expect(filterFixturesForScoreEntry(fixtures, linkedPlayerProfile).map((fixture) => fixture.id)).toEqual([
      'fixture-1',
    ]);
  });

  it('hides score fixtures when a player profile is not linked', () => {
    expect(filterFixturesForScoreEntry(fixtures, unlinkedPlayerProfile)).toEqual([]);
  });

  it('loads tournament data with default course metadata before the course table exists', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
    const from = vi.fn((table: string) => {
      if (table === 'players') {
        return { select: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      }

      if (table === 'course_holes') {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: "Could not find the table 'public.course_holes' in the schema cache",
              },
            }),
          }),
        };
      }

      if (table === 'tournaments') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }

      return { select: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const data = await fetchTournament2026Data({
      auth: { getUser },
      from,
    } as unknown as SupabaseClient<Database>);

    expect(data.courseHoles).toHaveLength(18);
    expect(data.courseHoles[0]).toMatchObject({ holeNumber: 1, strokeIndex: 3 });
  });

  it('ignores duplicate profile creation when the signed-in user already has one', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'profile-1', email: 'ian@example.com' } },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({
      error: {
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      },
    });
    const from = vi.fn(() => ({ insert }));

    await expect(
      createOwnProfile(
        { displayName: 'Ian' },
        {
          auth: { getUser },
          from,
        } as unknown as SupabaseClient<Database>
      )
    ).resolves.toBeUndefined();
  });

  it('updates the linked player and team together', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await updateProfilePlayerLink2026(
      {
        profileId: 'profile-1',
        playerId: 'usa-1',
        players,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith({ linked_player_id: 'usa-1', team: 'USA' });
    expect(eq).toHaveBeenCalledWith('id', 'profile-1');
  });

  it('updates player details and keeps linked profile teams in sync', async () => {
    const eqPlayer = vi.fn().mockResolvedValue({ error: null });
    const eqProfile = vi.fn().mockResolvedValue({ error: null });
    const updatePlayer = vi.fn(() => ({ eq: eqPlayer }));
    const updateProfiles = vi.fn(() => ({ eq: eqProfile }));
    const from = vi
      .fn()
      .mockReturnValueOnce({ update: updatePlayer })
      .mockReturnValueOnce({ update: updateProfiles });

    await updatePlayer2026(
      {
        playerId: 'usa-1',
        name: 'Ian Updated',
        team: 'EUROPE',
        currentCpi: 91,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenNthCalledWith(1, 'players');
    expect(updatePlayer).toHaveBeenCalledWith({
      name: 'Ian Updated',
      team: 'EUROPE',
      current_cpi: 91,
    });
    expect(eqPlayer).toHaveBeenCalledWith('id', 'usa-1');
    expect(from).toHaveBeenNthCalledWith(2, 'profiles');
    expect(updateProfiles).toHaveBeenCalledWith({ team: 'EUROPE' });
    expect(eqProfile).toHaveBeenCalledWith('linked_player_id', 'usa-1');
  });

  it('deletes a fixture by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: deleteRows }));

    await deleteFixture2026('fixture-1', { from } as unknown as SupabaseClient<Database>);

    expect(from).toHaveBeenCalledWith('fixtures');
    expect(deleteRows).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'fixture-1');
  });

  it('updates a fixture name', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await updateFixture2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        fixtureId: 'fixture-1',
        name: 'Morning Group',
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenCalledWith('fixtures');
    expect(update).toHaveBeenCalledWith({ name: 'Morning Group' });
    expect(eq).toHaveBeenCalledWith('id', 'fixture-1');
  });

  it('upserts course hole metadata by hole number', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));

    await updateCourseHole2026(
      {
        holeNumber: 1,
        strokeIndex: 3,
        par: 4,
        yardage: 401,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenCalledWith('course_holes');
    expect(upsert).toHaveBeenCalledWith(
      {
        hole_number: 1,
        stroke_index: 3,
        par: 4,
        yardage: 401,
      },
      { onConflict: 'hole_number' }
    );
  });

  it('updates an unscored singles segment pair and segment players', async () => {
    const segmentEq = vi.fn().mockResolvedValue({ error: null });
    const updateSegment = vi.fn(() => ({ eq: segmentEq }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ eq: deleteEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'segments') {
        return { update: updateSegment };
      }

      return { delete: deleteRows, insert };
    });

    await updateSegment2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        fixture: fixtureWithPlayers,
        segment: {
          id: 'segment-1',
          kind: 'singles',
          name: 'Singles A',
          usa_player_id: 'usa-1',
          europe_player_id: 'europe-1',
          holeScores: [],
        } as unknown as FixtureView['segments'][number],
        name: 'Singles One',
        usaPlayerId: 'usa-2',
        europePlayerId: 'europe-1',
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenNthCalledWith(1, 'segments');
    expect(updateSegment).toHaveBeenCalledWith({
      name: 'Singles One',
      usa_player_id: 'usa-2',
      europe_player_id: 'europe-1',
    });
    expect(segmentEq).toHaveBeenCalledWith('id', 'segment-1');
    expect(from).toHaveBeenNthCalledWith(2, 'segment_players');
    expect(deleteRows).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('segment_id', 'segment-1');
    expect(from).toHaveBeenNthCalledWith(3, 'segment_players');
    expect(insert).toHaveBeenCalledWith([
      { segment_id: 'segment-1', player_id: 'usa-2', team: 'USA', slot: 2 },
      { segment_id: 'segment-1', player_id: 'europe-1', team: 'EUROPE', slot: 1 },
    ]);
  });

  it('blocks singles player changes when the segment has saved scores', async () => {
    const from = vi.fn();

    await expect(
      updateSegment2026(
        {
          tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
          fixture: fixtureWithPlayers,
          segment: {
            id: 'segment-1',
            kind: 'singles',
            name: 'Singles A',
            usa_player_id: 'usa-1',
            europe_player_id: 'europe-1',
            holeScores: [{ id: 'score-1' }],
          } as unknown as FixtureView['segments'][number],
          name: 'Singles A',
          usaPlayerId: 'usa-2',
          europePlayerId: 'europe-1',
        },
        { from } as unknown as SupabaseClient<Database>
      )
    ).rejects.toThrow('Clear scores before changing singles players.');
    expect(from).not.toHaveBeenCalled();
  });

  it('clears segment scores before changing scored singles players when confirmed', async () => {
    const clearScoresEq = vi.fn().mockResolvedValue({ error: null });
    const clearScores = vi.fn(() => ({ eq: clearScoresEq }));
    const segmentEq = vi.fn().mockResolvedValue({ error: null });
    const updateSegment = vi.fn(() => ({ eq: segmentEq }));
    const deletePlayersEq = vi.fn().mockResolvedValue({ error: null });
    const deletePlayers = vi.fn(() => ({ eq: deletePlayersEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'hole_scores') {
        return { delete: clearScores };
      }

      if (table === 'segments') {
        return { update: updateSegment };
      }

      return { delete: deletePlayers, insert };
    });

    await updateSegment2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        fixture: fixtureWithPlayers,
        segment: {
          id: 'segment-1',
          kind: 'singles',
          name: 'Singles A',
          usa_player_id: 'usa-1',
          europe_player_id: 'europe-1',
          holeScores: [{ id: 'score-1' }],
        } as unknown as FixtureView['segments'][number],
        name: 'Singles A',
        usaPlayerId: 'usa-2',
        europePlayerId: 'europe-1',
        clearScoresOnPlayerChange: true,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenNthCalledWith(1, 'hole_scores');
    expect(clearScoresEq).toHaveBeenCalledWith('segment_id', 'segment-1');
    expect(updateSegment).toHaveBeenCalledWith({
      name: 'Singles A',
      usa_player_id: 'usa-2',
      europe_player_id: 'europe-1',
    });
    expect(insert).toHaveBeenCalledWith([
      { segment_id: 'segment-1', player_id: 'usa-2', team: 'USA', slot: 2 },
      { segment_id: 'segment-1', player_id: 'europe-1', team: 'EUROPE', slot: 1 },
    ]);
  });

  it('updates unscored foursomes segment membership', async () => {
    const segmentEq = vi.fn().mockResolvedValue({ error: null });
    const updateSegment = vi.fn(() => ({ eq: segmentEq }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ eq: deleteEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'segments') {
        return { update: updateSegment };
      }

      return { delete: deleteRows, insert };
    });

    await updateSegment2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        fixture: fixtureWithPlayers,
        segment: {
          id: 'front-9',
          kind: 'foursomes',
          name: 'Front 9',
          players: [
            { player_id: 'usa-1' },
            { player_id: 'europe-1' },
          ],
          holeScores: [],
        } as unknown as FixtureView['segments'][number],
        name: 'Alt shot',
        participantPlayerIds: ['usa-1', 'usa-2', 'europe-1'],
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(updateSegment).toHaveBeenCalledWith({ name: 'Alt shot' });
    expect(segmentEq).toHaveBeenCalledWith('id', 'front-9');
    expect(deleteEq).toHaveBeenCalledWith('segment_id', 'front-9');
    expect(insert).toHaveBeenCalledWith([
      { segment_id: 'front-9', player_id: 'usa-1', team: 'USA', slot: 1 },
      { segment_id: 'front-9', player_id: 'usa-2', team: 'USA', slot: 2 },
      { segment_id: 'front-9', player_id: 'europe-1', team: 'EUROPE', slot: 1 },
    ]);
  });

  it('blocks foursomes membership changes when the segment has saved scores', async () => {
    const from = vi.fn();

    await expect(
      updateSegment2026(
        {
          tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
          fixture: fixtureWithPlayers,
          segment: {
            id: 'front-9',
            kind: 'foursomes',
            name: 'Front 9',
            players: [
              { player_id: 'usa-1' },
              { player_id: 'europe-1' },
            ],
            holeScores: [{ id: 'score-1' }],
          } as unknown as FixtureView['segments'][number],
          name: 'Front 9',
          participantPlayerIds: ['usa-1', 'usa-2', 'europe-1'],
        },
        { from } as unknown as SupabaseClient<Database>
      )
    ).rejects.toThrow('Clear scores before changing foursomes players.');
    expect(from).not.toHaveBeenCalled();
  });

  it('clears segment scores before changing scored foursomes membership when confirmed', async () => {
    const clearScoresEq = vi.fn().mockResolvedValue({ error: null });
    const clearScores = vi.fn(() => ({ eq: clearScoresEq }));
    const segmentEq = vi.fn().mockResolvedValue({ error: null });
    const updateSegment = vi.fn(() => ({ eq: segmentEq }));
    const deletePlayersEq = vi.fn().mockResolvedValue({ error: null });
    const deletePlayers = vi.fn(() => ({ eq: deletePlayersEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'hole_scores') {
        return { delete: clearScores };
      }

      if (table === 'segments') {
        return { update: updateSegment };
      }

      return { delete: deletePlayers, insert };
    });

    await updateSegment2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        fixture: fixtureWithPlayers,
        segment: {
          id: 'front-9',
          kind: 'foursomes',
          name: 'Front 9',
          players: [
            { player_id: 'usa-1' },
            { player_id: 'europe-1' },
          ],
          holeScores: [{ id: 'score-1' }],
        } as unknown as FixtureView['segments'][number],
        name: 'Front 9',
        participantPlayerIds: ['usa-1', 'usa-2', 'europe-1'],
        clearScoresOnPlayerChange: true,
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenNthCalledWith(1, 'hole_scores');
    expect(clearScoresEq).toHaveBeenCalledWith('segment_id', 'front-9');
    expect(updateSegment).toHaveBeenCalledWith({ name: 'Front 9' });
    expect(insert).toHaveBeenCalledWith([
      { segment_id: 'front-9', player_id: 'usa-1', team: 'USA', slot: 1 },
      { segment_id: 'front-9', player_id: 'usa-2', team: 'USA', slot: 2 },
      { segment_id: 'front-9', player_id: 'europe-1', team: 'EUROPE', slot: 1 },
    ]);
  });

  it('clears all scores for a fixture segment set', async () => {
    const inFilter = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ delete: deleteRows }));

    await clearFixtureScores2026(
      {
        id: 'fixture-1',
        segments: [{ id: 'segment-1' }, { id: 'segment-2' }],
      } as unknown as FixtureView,
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenCalledWith('hole_scores');
    expect(deleteRows).toHaveBeenCalled();
    expect(inFilter).toHaveBeenCalledWith('segment_id', ['segment-1', 'segment-2']);
  });

  it('updates tournament details and recalculates existing scores when CPI threshold changes', async () => {
    const tournamentEq = vi.fn().mockResolvedValue({ error: null });
    const updateTournament = vi.fn(() => ({ eq: tournamentEq }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'tournaments') {
        return { update: updateTournament };
      }

      return { upsert };
    });

    await updateTournament2026(
      {
        tournament: {
          id: 'tournament-1',
          is_complete: false,
          cpi_threshold: 7,
        } as Database['public']['Tables']['tournaments']['Row'],
        fixtures: [
          {
            segments: [
              {
                id: 'segment-1',
                kind: 'singles',
                cpi_enabled: true,
                usa_player_id: 'usa-1',
                europe_player_id: 'europe-1',
                holeScores: [
                  {
                    hole_number: 10,
                    usa_score: 5,
                    europe_score: 4,
                  },
                ],
              },
            ],
          },
        ] as unknown as FixtureView[],
        players: [
          { id: 'usa-1', current_cpi: 90 },
          { id: 'europe-1', current_cpi: 80 },
        ] as PlayerRow[],
        name: 'Updated Cup',
        year: 2026,
        cpiThreshold: 8,
        updatedBy: 'profile-1',
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(updateTournament).toHaveBeenCalledWith({
      name: 'Updated Cup',
      year: 2026,
      cpi_threshold: 8,
    });
    expect(tournamentEq).toHaveBeenCalledWith('id', 'tournament-1');
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ segment_id: 'segment-1', hole_number: 10 })]),
      { onConflict: 'segment_id,hole_number' }
    );
  });

  it('clears one hole score by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: deleteRows }));

    await clearHoleScore2026(
      {
        tournament: { is_complete: false } as Database['public']['Tables']['tournaments']['Row'],
        scoreId: 'score-1',
      },
      { from } as unknown as SupabaseClient<Database>
    );

    expect(from).toHaveBeenCalledWith('hole_scores');
    expect(deleteRows).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'score-1');
  });
});

const players = [
  { id: 'usa-1', name: 'Ian', team: 'USA' },
  { id: 'europe-1', name: 'Tom', team: 'EUROPE' },
] as PlayerRow[];

const adminProfile = {
  id: 'admin-1',
  is_admin: true,
  linked_player_id: null,
} as ProfileRow;

const linkedPlayerProfile = {
  id: 'profile-1',
  is_admin: false,
  linked_player_id: 'usa-1',
} as ProfileRow;

const unlinkedPlayerProfile = {
  id: 'profile-2',
  is_admin: false,
  linked_player_id: null,
} as ProfileRow;

const fixtures = [
  {
    id: 'fixture-1',
    participants: [{ player_id: 'usa-1' }],
    segments: [],
  },
  {
    id: 'fixture-2',
    participants: [{ player_id: 'europe-1' }],
    segments: [],
  },
] as unknown as FixtureView[];

const fixtureWithPlayers = {
  id: 'fixture-1',
  participants: [
    { player_id: 'usa-1', team: 'USA', slot: 1 },
    { player_id: 'usa-2', team: 'USA', slot: 2 },
    { player_id: 'europe-1', team: 'EUROPE', slot: 1 },
  ],
  segments: [],
} as unknown as FixtureView;

