import { describe, expect, it } from 'vitest';
import { buildCustomFixtureSetupInput } from '../services/tournament2026Queries';

describe('custom 2026 fixture setup', () => {
  it('maps mobile fixture builder input into flexible fixture setup input', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Six ball',
      sortOrder: 2,
      usaPlayerIds: ['usa-1', 'usa-2', 'usa-3'],
      europePlayerIds: ['europe-1', 'europe-2', 'europe-3'],
      frontNinePlayerIds: ['usa-1', 'usa-2', 'europe-1', 'europe-2'],
      singlesPairs: [
        { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
        { usaPlayerId: 'usa-2', europePlayerId: 'europe-2', cpiEnabled: false },
        { usaPlayerId: 'usa-3', europePlayerId: 'europe-3', cpiEnabled: true },
      ],
    });

    expect(setupInput.participants).toHaveLength(6);
    expect(setupInput.segments).toHaveLength(4);
    expect(setupInput.segments[0]).toMatchObject({
      kind: 'foursomes',
      holeStart: 1,
      holeEnd: 9,
    });
    expect(setupInput.segments[2]).toMatchObject({
      kind: 'singles',
      usaPlayerId: 'usa-2',
      europePlayerId: 'europe-2',
      cpiEnabled: false,
    });
  });

  it('maps 1v1 input into one full-course singles-only segment', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Singles playoff',
      sortOrder: 3,
      usaPlayerIds: ['usa-1'],
      europePlayerIds: ['europe-1'],
      frontNinePlayerIds: [],
      singlesPairs: [{ usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: false }],
    });

    expect(setupInput.participants).toEqual([
      { playerId: 'usa-1', team: 'USA', slot: 1 },
      { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
    ]);
    expect(setupInput.segments).toEqual([
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
    ]);
  });

  it('allows 1v1 players from any roster team by assigning match sides', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Same side match',
      sortOrder: 4,
      usaPlayerIds: ['usa-1'],
      europePlayerIds: ['usa-2'],
      frontNinePlayerIds: [],
      singlesPairs: [{ usaPlayerId: 'usa-1', europePlayerId: 'usa-2', cpiEnabled: true }],
    });

    expect(setupInput.participants).toEqual([
      { playerId: 'usa-1', team: 'USA', slot: 1 },
      { playerId: 'usa-2', team: 'EUROPE', slot: 1 },
    ]);
    expect(setupInput.segments[0]).toMatchObject({
      kind: 'singles',
      holeStart: 1,
      holeEnd: 18,
      usaPlayerId: 'usa-1',
      europePlayerId: 'usa-2',
    });
  });

  it('rejects duplicate singles players before persistence', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad fixture',
        sortOrder: 0,
        usaPlayerIds: ['usa-1', 'usa-2'],
        europePlayerIds: ['europe-1', 'europe-2'],
        frontNinePlayerIds: ['usa-1', 'europe-1'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-2', cpiEnabled: true },
        ],
      })
    ).toThrow('Duplicate singles player: usa-1');
  });
});

