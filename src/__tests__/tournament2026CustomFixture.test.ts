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

