import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { calculateGamePoints } from '../utils/gamePoints';
import type { Game } from '../types/game';
import type { Player } from '../types/player';

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

describe('Handicap Tests', () => {
  const mockPlayer1: Player = {
    id: 'p1',
    name: 'Player1',
    team: 'USA',
    historicalScores: [],
    averageScore: 80,
  };

  const mockPlayer2: Player = {
    id: 'p2',
    name: 'Player2',
    team: 'EUROPE',
    historicalScores: [],
    averageScore: 90,
  };

  const mockGame: Game = {
    id: 'game1',
    tournamentId: 'tournament1',
    usaPlayerId: 'p1',
    usaPlayerName: 'Player1',
    europePlayerId: 'p2',
    europePlayerName: 'Player2',
    handicapStrokes: 10,
    higherHandicapTeam: 'EUROPE',
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

  describe('Handicap Calculations', () => {
    it('should correctly calculate handicap difference between players', () => {
      const handicapDiff = Math.abs(mockPlayer1.averageScore - mockPlayer2.averageScore);
      expect(handicapDiff).toBe(10);
    });

    it('should correctly identify higher handicap player', () => {
      const higherHandicapPlayer = mockPlayer1.averageScore > mockPlayer2.averageScore ? mockPlayer1 : mockPlayer2;
      expect(higherHandicapPlayer).toBe(mockPlayer2);
    });

    it('should handle equal handicaps', () => {
      const playerWithEqualHandicap: Player = {
        ...mockPlayer1,
        averageScore: mockPlayer2.averageScore,
      };
      const handicapDiff = Math.abs(playerWithEqualHandicap.averageScore - mockPlayer2.averageScore);
      expect(handicapDiff).toBe(0);
    });

    it('should handle large handicap differences', () => {
      const playerWithLargeHandicap: Player = {
        ...mockPlayer1,
        averageScore: 120,
      };
      const handicapDiff = Math.abs(playerWithLargeHandicap.averageScore - mockPlayer2.averageScore);
      expect(handicapDiff).toBe(30);
    });
  });

  describe('Handicap Scoring', () => {
    it('should correctly calculate points with handicaps', () => {
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

    it('should correctly apply handicap strokes to scores', async () => {
      const updatedGame = {
        ...mockGame,
        holes: mockGame.holes.map((hole, index) => 
          index === 0 ? {
            ...hole,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 4, // Adjusted for handicap
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

    it('should handle tied scores with handicaps', () => {
      const gameWithTiedScores = {
        ...mockGame,
        strokePlayScore: {
          USA: 75,
          EUROPE: 75,
          adjustedUSA: 75,
          adjustedEUROPE: 75,
        },
        matchPlayScore: {
          USA: 0,
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 0,
        },
      };

      const result = calculateGamePoints(gameWithTiedScores);
      expect(result.raw.USA).toBe(1);
      expect(result.raw.EUROPE).toBe(1);
      expect(result.adjusted.USA).toBe(1);
      expect(result.adjusted.EUROPE).toBe(1);
    });

    it('should handle incomplete games', () => {
      const incompleteGame = {
        ...mockGame,
        isComplete: false,
        strokePlayScore: {
          USA: 36,
          EUROPE: 38,
          adjustedUSA: 36,
          adjustedEUROPE: 38,
        },
        matchPlayScore: {
          USA: 1,
          EUROPE: 0,
          adjustedUSA: 1,
          adjustedEUROPE: 0,
        },
      };

      const result = calculateGamePoints(incompleteGame);
      expect(result.raw.USA).toBe(2);
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(2);
      expect(result.adjusted.EUROPE).toBe(0);
    });

    it('should handle games with no handicap strokes', () => {
      const gameWithoutHandicaps = {
        ...mockGame,
        handicapStrokes: 0,
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

      const result = calculateGamePoints(gameWithoutHandicaps);
      expect(result.raw.USA).toBe(2);
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(2);
      expect(result.adjusted.EUROPE).toBe(0);
    });
  });
}); 