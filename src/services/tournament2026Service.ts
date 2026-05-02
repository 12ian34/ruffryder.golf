import type { SupabaseClient } from '@supabase/supabase-js';
import type { FixtureSetupInput, FixtureSetupPayload } from '../domain/2026/fixtures';
import { buildFixtureSetupPayload } from '../domain/2026/fixtures';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type FixtureInsert = Database['public']['Tables']['fixtures']['Insert'];
type FixturePlayerInsert = Database['public']['Tables']['fixture_players']['Insert'];
type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
type SegmentPlayerInsert = Database['public']['Tables']['segment_players']['Insert'];

export interface FixtureSetupRepository {
  insertFixture(row: FixtureInsert): Promise<void>;
  insertFixturePlayers(rows: FixturePlayerInsert[]): Promise<void>;
  insertSegments(rows: SegmentInsert[]): Promise<void>;
  insertSegmentPlayers(rows: SegmentPlayerInsert[]): Promise<void>;
  rollbackFixture(fixtureId: string): Promise<void>;
}

export async function createFixtureSetup(
  input: FixtureSetupInput,
  repository: FixtureSetupRepository = supabaseFixtureSetupRepository
): Promise<FixtureSetupPayload> {
  const payload = buildFixtureSetupPayload(input);
  const fixtureId = payload.fixture.id;

  if (!fixtureId) {
    throw new Error('Fixture setup payload is missing a fixture id');
  }

  try {
    await repository.insertFixture(payload.fixture);
    await repository.insertFixturePlayers(payload.fixturePlayers);
    await repository.insertSegments(payload.segments);
    await repository.insertSegmentPlayers(payload.segmentPlayers);
  } catch (error) {
    await repository.rollbackFixture(fixtureId);
    throw error;
  }

  return payload;
}

export const supabaseFixtureSetupRepository: FixtureSetupRepository = {
  async insertFixture(row) {
    const { error } = await supabase.from('fixtures').insert(row);
    throwIfSupabaseError(error, 'Failed to create fixture');
  },
  async insertFixturePlayers(rows) {
    if (rows.length === 0) return;

    const { error } = await supabase.from('fixture_players').insert(rows);
    throwIfSupabaseError(error, 'Failed to create fixture players');
  },
  async insertSegments(rows) {
    if (rows.length === 0) return;

    const { error } = await supabase.from('segments').insert(rows);
    throwIfSupabaseError(error, 'Failed to create fixture segments');
  },
  async insertSegmentPlayers(rows) {
    if (rows.length === 0) return;

    const { error } = await supabase.from('segment_players').insert(rows);
    throwIfSupabaseError(error, 'Failed to create segment players');
  },
  async rollbackFixture(fixtureId) {
    const { error } = await supabase.from('fixtures').delete().eq('id', fixtureId);
    throwIfSupabaseError(error, 'Failed to roll back fixture setup');
  },
};

export function createSupabaseFixtureSetupRepository(
  client: SupabaseClient<Database>
): FixtureSetupRepository {
  return {
    async insertFixture(row) {
      const { error } = await client.from('fixtures').insert(row);
      throwIfSupabaseError(error, 'Failed to create fixture');
    },
    async insertFixturePlayers(rows) {
      if (rows.length === 0) return;

      const { error } = await client.from('fixture_players').insert(rows);
      throwIfSupabaseError(error, 'Failed to create fixture players');
    },
    async insertSegments(rows) {
      if (rows.length === 0) return;

      const { error } = await client.from('segments').insert(rows);
      throwIfSupabaseError(error, 'Failed to create fixture segments');
    },
    async insertSegmentPlayers(rows) {
      if (rows.length === 0) return;

      const { error } = await client.from('segment_players').insert(rows);
      throwIfSupabaseError(error, 'Failed to create segment players');
    },
    async rollbackFixture(fixtureId) {
      const { error } = await client.from('fixtures').delete().eq('id', fixtureId);
      throwIfSupabaseError(error, 'Failed to roll back fixture setup');
    },
  };
}

function throwIfSupabaseError(error: { message: string } | null, message: string): void {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}
