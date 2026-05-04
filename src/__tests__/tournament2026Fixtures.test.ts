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

  it('builds a 1v1 singles-only fixture without a front-nine segment', () => {
    const payload = buildFixtureSetupPayload({
      tournamentId: 'tournament-1',
      fixtureName: 'Singles playoff',
      sortOrder: 4,
      idFactory: createIdFactory(['fixture-1v1', 'singles-1']),
      participants: [
        { playerId: 'usa-1', team: 'USA', slot: 1 },
        { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
      ],
      segments: [
        {
          kind: 'singles',
          name: 'Singles A',
          sortOrder: 1,
          holeStart: 1,
          holeEnd: 18,
          usaPlayerId: 'usa-1',
          europePlayerId: 'europe-1',
          cpiEnabled: false,
        },
      ],
    });

    expect(payload.fixturePlayers).toHaveLength(2);
    expect(payload.segments).toHaveLength(1);
    expect(payload.segmentPlayers).toHaveLength(2);
    expect(payload.segments[0]).toMatchObject({
      id: 'singles-1',
      kind: 'singles',
      sort_order: 1,
      hole_start: 1,
      hole_end: 18,
      cpi_enabled: false,
      usa_player_id: 'usa-1',
      europe_player_id: 'europe-1',
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

  it('rejects duplicate fixture players and duplicate team slots', () => {
    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'usa-1', team: 'USA', slot: 2 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'singles',
            sortOrder: 1,
            holeStart: 10,
            holeEnd: 18,
            usaPlayerId: 'usa-1',
            europePlayerId: 'europe-1',
          },
        ],
      })
    ).toThrow('Duplicate fixture player: usa-1');

    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'usa-2', team: 'USA', slot: 1 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'singles',
            sortOrder: 1,
            holeStart: 10,
            holeEnd: 18,
            usaPlayerId: 'usa-1',
            europePlayerId: 'europe-1',
          },
        ],
      })
    ).toThrow('Duplicate fixture team slot: USA:1');
  });

  it('rejects invalid fixture sizes and segment hole ranges', () => {
    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [{ playerId: 'usa-1', team: 'USA', slot: 1 }],
        segments: [],
      })
    ).toThrow('A fixture must have between 2 and 6 players');

    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'singles',
            sortOrder: 1,
            holeStart: 18,
            holeEnd: 10,
            usaPlayerId: 'usa-1',
            europePlayerId: 'europe-1',
          },
        ],
      })
    ).toThrow('Invalid hole range for singles segment: 18-10');
  });

  it('rejects duplicate segment sort orders and invalid segment player lists', () => {
    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
          { playerId: 'europe-2', team: 'EUROPE', slot: 2 },
        ],
        segments: [
          {
            kind: 'singles',
            sortOrder: 1,
            holeStart: 10,
            holeEnd: 18,
            usaPlayerId: 'usa-1',
            europePlayerId: 'europe-1',
          },
          {
            kind: 'singles',
            sortOrder: 1,
            holeStart: 10,
            holeEnd: 18,
            usaPlayerId: 'usa-1',
            europePlayerId: 'europe-2',
          },
        ],
      })
    ).toThrow('Duplicate segment sort order: 1');

    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'usa-2', team: 'USA', slot: 2 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'foursomes',
            sortOrder: 1,
            holeStart: 1,
            holeEnd: 9,
            participants: [
              { playerId: 'usa-1', team: 'USA' },
              { playerId: 'usa-2', team: 'USA' },
            ],
          },
        ],
      })
    ).toThrow('foursomes segment must include at least one USA player and one EUROPE player');
  });

  it('rejects segment participants with duplicate slots or mismatched teams', () => {
    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'usa-2', team: 'USA', slot: 2 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'foursomes',
            sortOrder: 1,
            holeStart: 1,
            holeEnd: 9,
            participants: [
              { playerId: 'usa-1', team: 'USA', slot: 1 },
              { playerId: 'usa-2', team: 'USA', slot: 1 },
              { playerId: 'europe-1', team: 'EUROPE' },
            ],
          },
        ],
      })
    ).toThrow('Duplicate segment team slot: USA:1');

    expect(() =>
      buildFixtureSetupPayload({
        tournamentId: 'tournament-1',
        participants: [
          { playerId: 'usa-1', team: 'USA', slot: 1 },
          { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
        ],
        segments: [
          {
            kind: 'foursomes',
            sortOrder: 1,
            holeStart: 1,
            holeEnd: 9,
            participants: [
              { playerId: 'usa-1', team: 'EUROPE' },
              { playerId: 'europe-1', team: 'USA' },
            ],
          },
        ],
      })
    ).toThrow('Player usa-1 is not on team EUROPE');
  });
});
