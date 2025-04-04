import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { calculateGamePoints } from '../utils/gamePoints';
import type { Game } from '../types/game';

// Mock Firebase functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({
    type: 'firestore',
    app: {},
    toJSON: () => ({}),
    id: 'mock-db',
    path: '',
    parent: null,
    converter: null,
    firestore: null,
  })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('Score Entry Tests', () => {
  const mockGame: Game = {
    id: 'game1',
    tournamentId: 'tournament1',
    usaPlayerId: 'p1',
    usaPlayerName: 'Player1',
    europePlayerId: 'p2',
    europePlayerName: 'Player2',
    handicapStrokes: 0,
    higherHandicapTeam: 'USA',
    holes: Array(18).fill({
      holeNumber: 1,
      strokeIndex: 1,
      parScore: 4,
      usaPlayerScore: null,
      europePlayerScore: null,
      usaPlayerAdjustedScore: null,
      europePlayerAdjustedScore: null,
      usaPlayerMatchPlayScore: 0,
      europePlayerMatchPlayScore: 0,
      usaPlayerMatchPlayAdjustedScore: 0,
      europePlayerMatchPlayAdjustedScore: 0,
    }),
    strokePlayScore: {
      USA: 0,
      EUROPE: 0,
      adjustedUSA: 0,
      adjustedEUROPE: 0,
    },
    matchPlayScore: {
      USA: 0,
      EUROPE: 0,
      adjustedUSA: 0,
      adjustedEUROPE: 0,
    },
    points: {
      raw: { USA: 0, EUROPE: 0 },
      adjusted: { USA: 0, EUROPE: 0 },
    },
    isComplete: false,
    isStarted: true,
    playerIds: ['p1', 'p2'],
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly update scores for a hole', async () => {
    const updatedGame = {
      ...mockGame,
      holes: mockGame.holes.map((hole, index) => 
        index === 0 ? {
          ...hole,
          usaPlayerScore: 4,
          europePlayerScore: 5,
        } : hole
      ),
    };

    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockGame,
    });

    (updateDoc as any).mockResolvedValueOnce(undefined);

    const result = await updateDoc(
      doc({} as any, 'tournaments', 'tournament1', 'games', 'game1'),
      { holes: updatedGame.holes }
    );

    expect(result).toBeUndefined();
    expect(updateDoc).toHaveBeenCalledWith(
      expect.any(Object),
      { holes: updatedGame.holes }
    );
  });

  it('should calculate correct match play scores', () => {
    const gameWithScores = {
      ...mockGame,
      strokePlayScore: {
        USA: 72,
        EUROPE: 75,
        adjustedUSA: 72,
        adjustedEUROPE: 75,
      },
      matchPlayScore: {
        USA: 2,
        EUROPE: 1,
        adjustedUSA: 2,
        adjustedEUROPE: 1,
      },
    };

    const result = calculateGamePoints(gameWithScores);
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });
}); 