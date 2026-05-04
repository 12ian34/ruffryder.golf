import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { FixtureSetupInput } from '../domain/2026/fixtures';
import type { FixtureSetupRepository } from '../services/tournament2026Service';
import {
  createFixtureSetup,
  createSupabaseFixtureSetupRepository,
} from '../services/tournament2026Service';
import type { Database } from '../types/supabase';

function createIdFactory(ids: string[]): () => string {
  let index = 0;

  return () => {
    const id = ids[index];
    index += 1;

    if (!id) {
      throw new Error('Test id factory ran out of ids');
    }

    return id;
  };
}

function createFixtureInput(idFactory: () => string): FixtureSetupInput {
  return {
    tournamentId: 'tournament-1',
    fixtureName: 'Group 1',
    idFactory,
    participants: [
      { playerId: 'usa-1', team: 'USA', slot: 1 },
      { playerId: 'usa-2', team: 'USA', slot: 2 },
      { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
      { playerId: 'europe-2', team: 'EUROPE', slot: 2 },
    ],
    segments: [
      {
        kind: 'foursomes',
        name: 'Front 9 Foursomes',
        sortOrder: 1,
        holeStart: 1,
        holeEnd: 9,
        participants: [
          { playerId: 'usa-1', team: 'USA' },
          { playerId: 'usa-2', team: 'USA' },
          { playerId: 'europe-1', team: 'EUROPE' },
          { playerId: 'europe-2', team: 'EUROPE' },
        ],
      },
      {
        kind: 'singles',
        name: 'Singles A',
        sortOrder: 2,
        holeStart: 10,
        holeEnd: 18,
        usaPlayerId: 'usa-1',
        europePlayerId: 'europe-1',
      },
    ],
  };
}

describe('2026 tournament service', () => {
  it('persists fixture setup rows in dependency order', async () => {
    const calls: string[] = [];
    const repository: FixtureSetupRepository = {
      async insertFixture(row) {
        calls.push(`fixture:${row.id}`);
      },
      async insertFixturePlayers(rows) {
        calls.push(`fixturePlayers:${rows.length}`);
      },
      async insertSegments(rows) {
        calls.push(`segments:${rows.length}`);
      },
      async insertSegmentPlayers(rows) {
        calls.push(`segmentPlayers:${rows.length}`);
      },
      async rollbackFixture(fixtureId) {
        calls.push(`rollback:${fixtureId}`);
      },
    };

    const payload = await createFixtureSetup(
      createFixtureInput(createIdFactory(['fixture-1', 'front-9', 'singles-1'])),
      repository
    );

    expect(payload.fixture.id).toBe('fixture-1');
    expect(calls).toEqual([
      'fixture:fixture-1',
      'fixturePlayers:4',
      'segments:2',
      'segmentPlayers:6',
    ]);
  });

  it('rolls back the fixture if a dependent insert fails', async () => {
    const calls: string[] = [];
    const repository: FixtureSetupRepository = {
      async insertFixture(row) {
        calls.push(`fixture:${row.id}`);
      },
      async insertFixturePlayers(rows) {
        calls.push(`fixturePlayers:${rows.length}`);
      },
      async insertSegments(rows) {
        calls.push(`segments:${rows.length}`);
        throw new Error('segment insert failed');
      },
      async insertSegmentPlayers(rows) {
        calls.push(`segmentPlayers:${rows.length}`);
      },
      async rollbackFixture(fixtureId) {
        calls.push(`rollback:${fixtureId}`);
      },
    };

    await expect(
      createFixtureSetup(
        createFixtureInput(createIdFactory(['fixture-1', 'front-9', 'singles-1'])),
        repository
      )
    ).rejects.toThrow('segment insert failed');

    expect(calls).toEqual([
      'fixture:fixture-1',
      'fixturePlayers:4',
      'segments:2',
      'rollback:fixture-1',
    ]);
  });

  it('adapts Supabase table writes into the fixture setup repository contract', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ insert, delete: deleteRows }));
    const repository = createSupabaseFixtureSetupRepository({
      from,
    } as unknown as SupabaseClient<Database>);

    await repository.insertFixture({ id: 'fixture-1' } as Database['public']['Tables']['fixtures']['Insert']);
    await repository.insertFixturePlayers([
      { fixture_id: 'fixture-1', player_id: 'player-1', team: 'USA', slot: 1 },
    ]);
    await repository.insertSegments([
      {
        id: 'segment-1',
        fixture_id: 'fixture-1',
        kind: 'singles',
        hole_start: 1,
        hole_end: 18,
        sort_order: 1,
      },
    ] as Database['public']['Tables']['segments']['Insert'][]);
    await repository.insertSegmentPlayers([
      { segment_id: 'segment-1', player_id: 'player-1', team: 'USA', slot: 1 },
    ]);
    await repository.rollbackFixture('fixture-1');

    expect(from).toHaveBeenCalledWith('fixtures');
    expect(from).toHaveBeenCalledWith('fixture_players');
    expect(from).toHaveBeenCalledWith('segments');
    expect(from).toHaveBeenCalledWith('segment_players');
    expect(deleteRows).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'fixture-1');
  });

  it('skips empty dependent Supabase inserts', async () => {
    const from = vi.fn();
    const repository = createSupabaseFixtureSetupRepository({
      from,
    } as unknown as SupabaseClient<Database>);

    await repository.insertFixturePlayers([]);
    await repository.insertSegments([]);
    await repository.insertSegmentPlayers([]);

    expect(from).not.toHaveBeenCalled();
  });

  it('wraps Supabase repository errors with setup-specific context', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'permission denied' } });
    const from = vi.fn(() => ({ insert }));
    const repository = createSupabaseFixtureSetupRepository({
      from,
    } as unknown as SupabaseClient<Database>);

    await expect(
      repository.insertFixture({ id: 'fixture-1' } as Database['public']['Tables']['fixtures']['Insert'])
    ).rejects.toThrow('Failed to create fixture: permission denied');
  });
});
