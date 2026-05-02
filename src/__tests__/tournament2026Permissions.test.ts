import { describe, expect, it, vi } from 'vitest';
import { filterFixturesForScoreEntry } from '../features/tournament2026/viewUtils';
import {
  updateProfilePlayerLink2026,
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

