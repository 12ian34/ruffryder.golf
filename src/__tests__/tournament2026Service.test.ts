import { describe, expect, it } from 'vitest';
import type { FixtureSetupInput } from '../domain/2026/fixtures';
import type { FixtureSetupRepository } from '../services/tournament2026Service';
import { createFixtureSetup } from '../services/tournament2026Service';

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
});
