import { describe, expect, it } from 'vitest';
import { buildFixtureSetupPayload } from '../domain/2026/fixtures';

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

describe('2026 fixture setup builder', () => {
  it('builds a normal 4-ball fixture with one foursomes segment and two singles segments', () => {
    const payload = buildFixtureSetupPayload({
      tournamentId: 'tournament-1',
      fixtureName: 'Group 1',
      sortOrder: 1,
      idFactory: createIdFactory(['fixture-1', 'front-9', 'singles-1', 'singles-2']),
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
        {
          kind: 'singles',
          name: 'Singles B',
          sortOrder: 3,
          holeStart: 10,
          holeEnd: 18,
          usaPlayerId: 'usa-2',
          europePlayerId: 'europe-2',
        },
      ],
    });

    expect(payload.fixture).toMatchObject({
      id: 'fixture-1',
      tournament_id: 'tournament-1',
      name: 'Group 1',
      sort_order: 1,
      status: 'not_started',
    });
    expect(payload.fixturePlayers).toHaveLength(4);
    expect(payload.segments).toHaveLength(3);
    expect(payload.segmentPlayers).toHaveLength(8);
    expect(payload.segments[0]).toMatchObject({
      id: 'front-9',
      kind: 'foursomes',
      cpi_enabled: false,
      usa_player_id: null,
      europe_player_id: null,
    });
    expect(payload.segments[1]).toMatchObject({
      id: 'singles-1',
      kind: 'singles',
      cpi_enabled: true,
      usa_player_id: 'usa-1',
      europe_player_id: 'europe-1',
    });
  });

  it('builds a flexible 6-ball fixture with three back-nine singles segments', () => {
    const payload = buildFixtureSetupPayload({
      tournamentId: 'tournament-1',
      idFactory: createIdFactory(['fixture-6', 'front-9', 'singles-1', 'singles-2', 'singles-3']),
      participants: [
        { playerId: 'usa-1', team: 'USA', slot: 1 },
        { playerId: 'usa-2', team: 'USA', slot: 2 },
        { playerId: 'usa-3', team: 'USA', slot: 3 },
        { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        { playerId: 'europe-2', team: 'EUROPE', slot: 2 },
        { playerId: 'europe-3', team: 'EUROPE', slot: 3 },
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
        {
          kind: 'singles',
          name: 'Singles B',
          sortOrder: 3,
          holeStart: 10,
          holeEnd: 18,
          usaPlayerId: 'usa-2',
          europePlayerId: 'europe-2',
        },
        {
          kind: 'singles',
          name: 'Singles C',
          sortOrder: 4,
          holeStart: 10,
          holeEnd: 18,
          usaPlayerId: 'usa-3',
          europePlayerId: 'europe-3',
        },
      ],
    });

    expect(payload.fixturePlayers).toHaveLength(6);
    expect(payload.segments).toHaveLength(4);
    expect(payload.segmentPlayers).toHaveLength(10);
    expect(payload.fixturePlayers).toContainEqual({
      fixture_id: 'fixture-6',
      player_id: 'usa-3',
      team: 'USA',
      slot: 3,
    });
  });

  it('rejects a singles segment with a player outside the fixture', () => {
    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        idFactory: createIdFactory(['fixture-1']),
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'singles',
            name: 'Invalid Singles',
            sortOrder: 1,
            holeStart: 10,
            holeEnd: 18,
            usaPlayerId: 'usa-2',
            europePlayerId: 'europe-1',
          },
        ],
      })
    ).toThrow('Player usa-2 is not assigned to this fixture');
  });
});
