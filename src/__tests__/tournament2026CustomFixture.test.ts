import { describe, expect, it } from 'vitest';
import { buildCustomFixtureSetupInput } from '../services/tournament2026Queries';

describe('custom 2026 fixture setup', () => {
  it('maps 6-player flexible fixture input into front-nine foursomes and three singles', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Six ball',
      sortOrder: 2,
      template: 'flexible_6_player',
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

  it('maps 4-player standard fixture input into foursomes and two back-nine singles', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Standard match',
      sortOrder: 1,
      template: 'standard_4_player',
      usaPlayerIds: ['usa-1', 'usa-2'],
      europePlayerIds: ['europe-1', 'europe-2'],
      frontNinePlayerIds: ['usa-1', 'usa-2', 'europe-1', 'europe-2'],
      singlesPairs: [
        { usaPlayerId: 'usa-1', europePlayerId: 'europe-2', cpiEnabled: true },
        { usaPlayerId: 'usa-2', europePlayerId: 'europe-1', cpiEnabled: true },
      ],
    });

    expect(setupInput.participants).toEqual([
      { playerId: 'usa-1', team: 'USA', slot: 1 },
      { playerId: 'usa-2', team: 'USA', slot: 2 },
      { playerId: 'europe-1', team: 'EUROPE', slot: 1 },
      { playerId: 'europe-2', team: 'EUROPE', slot: 2 },
    ]);
    expect(setupInput.segments).toHaveLength(3);
    expect(setupInput.segments[0]).toMatchObject({
      kind: 'foursomes',
      holeStart: 1,
      holeEnd: 9,
    });
    expect(setupInput.segments[1]).toMatchObject({
      kind: 'singles',
      holeStart: 10,
      holeEnd: 18,
      usaPlayerId: 'usa-1',
      europePlayerId: 'europe-2',
    });
  });

  it('maps 2-player full-18 input into one full-course singles-only segment', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Singles playoff',
      sortOrder: 3,
      template: 'full_18_singles',
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

  it('allows 2-player full-18 players from any roster team by assigning match sides', () => {
    const setupInput = buildCustomFixtureSetupInput({
      tournamentId: 'tournament-1',
      name: 'Same side match',
      sortOrder: 4,
      template: 'full_18_singles',
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
        template: 'standard_4_player',
        usaPlayerIds: ['usa-1', 'usa-2'],
        europePlayerIds: ['europe-1', 'europe-2'],
        frontNinePlayerIds: ['usa-1', 'usa-2', 'europe-1', 'europe-2'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-2', cpiEnabled: true },
        ],
      })
    ).toThrow('Duplicate singles player: usa-1');
  });

  it('rejects a standard match when the front nine does not include all four players', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad front nine',
        sortOrder: 0,
        template: 'standard_4_player',
        usaPlayerIds: ['usa-1', 'usa-2'],
        europePlayerIds: ['europe-1', 'europe-2'],
        frontNinePlayerIds: ['usa-1', 'europe-1'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-2', europePlayerId: 'europe-2', cpiEnabled: true },
        ],
      })
    ).toThrow('A 4-player standard match uses all four players for front-nine foursomes.');
  });

  it('rejects singles pairs that reference players outside the fixture', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad singles player',
        sortOrder: 0,
        template: 'standard_4_player',
        usaPlayerIds: ['usa-1', 'usa-2'],
        europePlayerIds: ['europe-1', 'europe-2'],
        frontNinePlayerIds: ['usa-1', 'usa-2', 'europe-1', 'europe-2'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-2', europePlayerId: 'europe-3', cpiEnabled: true },
        ],
      })
    ).toThrow('Singles players must be selected in this fixture.');
  });

  it('rejects full-18 singles templates with front-nine players or missing singles pairs', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad full 18',
        sortOrder: 0,
        template: 'full_18_singles',
        usaPlayerIds: ['usa-1'],
        europePlayerIds: ['europe-1'],
        frontNinePlayerIds: ['usa-1', 'europe-1'],
        singlesPairs: [{ usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true }],
      })
    ).toThrow('A 2-player full 18 fixture cannot include front-nine foursomes.');

    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'No singles',
        sortOrder: 0,
        template: 'full_18_singles',
        usaPlayerIds: ['usa-1'],
        europePlayerIds: ['europe-1'],
        frontNinePlayerIds: [],
        singlesPairs: [],
      })
    ).toThrow('A 2-player full 18 fixture needs exactly one singles match.');
  });

  it('rejects flexible 6-player templates without the required foursomes mix', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad six ball front nine',
        sortOrder: 0,
        template: 'flexible_6_player',
        usaPlayerIds: ['usa-1', 'usa-2', 'usa-3'],
        europePlayerIds: ['europe-1', 'europe-2', 'europe-3'],
        frontNinePlayerIds: ['usa-1', 'usa-2', 'usa-3', 'europe-1'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-2', europePlayerId: 'europe-2', cpiEnabled: true },
          { usaPlayerId: 'usa-3', europePlayerId: 'europe-3', cpiEnabled: true },
        ],
      })
    ).toThrow('A 6-player flexible match needs 2 USA and 2 Europe players for front-nine foursomes.');
  });

  it('rejects front-nine players outside the custom fixture roster', () => {
    expect(() =>
      buildCustomFixtureSetupInput({
        tournamentId: 'tournament-1',
        name: 'Bad front nine player',
        sortOrder: 0,
        template: 'standard_4_player',
        usaPlayerIds: ['usa-1', 'usa-2'],
        europePlayerIds: ['europe-1', 'europe-2'],
        frontNinePlayerIds: ['usa-1', 'usa-2', 'europe-1', 'europe-3'],
        singlesPairs: [
          { usaPlayerId: 'usa-1', europePlayerId: 'europe-1', cpiEnabled: true },
          { usaPlayerId: 'usa-2', europePlayerId: 'europe-2', cpiEnabled: true },
        ],
      })
    ).toThrow('Front-nine player europe-3 is not assigned to this fixture');
  });
});

