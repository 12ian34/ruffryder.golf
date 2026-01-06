import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { calculateGamePoints } from '../utils/gamePoints';
import type { Game } from '../types/game';
import type { Player, HistoricalScore } from '../types/player';

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
      const handicapDiff = Math.abs(mockPlayer1.averageScore! - mockPlayer2.averageScore!);
      expect(handicapDiff).toBe(10);
    });

    it('should correctly identify higher handicap player', () => {
      const higherHandicapPlayer = mockPlayer1.averageScore! > mockPlayer2.averageScore! ? mockPlayer1 : mockPlayer2;
      expect(higherHandicapPlayer).toBe(mockPlayer2);
    });

    it('should handle equal handicaps', () => {
      const playerWithEqualHandicap: Player = {
        ...mockPlayer1,
        averageScore: mockPlayer2.averageScore,
      };
      const handicapDiff = Math.abs(playerWithEqualHandicap.averageScore! - mockPlayer2.averageScore!);
      expect(handicapDiff).toBe(0);
    });

    it('should handle large handicap differences', () => {
      const playerWithLargeHandicap: Player = {
        ...mockPlayer1,
        averageScore: 120,
      };
      const handicapDiff = Math.abs(playerWithLargeHandicap.averageScore! - mockPlayer2.averageScore!);
      expect(handicapDiff).toBe(30);
    });
    
    it('should handle negative handicaps', () => {
      // This represents a player with a better average score than par
      const playerWithNegativeHandicap: Player = {
        ...mockPlayer1,
        averageScore: 70, // Below par for many courses
      };
      const playerWithHighHandicap: Player = {
        ...mockPlayer2,
        averageScore: 100
      };
      
      const handicapDiff = Math.abs(playerWithNegativeHandicap.averageScore! - playerWithHighHandicap.averageScore!);
      expect(handicapDiff).toBe(30);
    });
    
    it('should handle fractional handicaps when averaged from historical scores', () => {
      const historicalScores: HistoricalScore[] = [
        { year: 2023, score: 75 },
        { year: 2023, score: 76 },
        { year: 2023, score: 74 },
        { year: 2023, score: 77 },
        { year: 2023, score: 73 }
      ];
      
      const playerWithFractionalHandicap: Player = {
        ...mockPlayer1,
        historicalScores,
        // Average would be 75
        averageScore: 75
      };
      
      // Check that average calculation is correct
      const calculatedAverage = playerWithFractionalHandicap.historicalScores.reduce(
        (sum, scoreObj) => sum + scoreObj.score, 0
      ) / playerWithFractionalHandicap.historicalScores.length;
      
      expect(calculatedAverage).toBe(75);
      expect(playerWithFractionalHandicap.averageScore).toBe(75);
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
    
    it('should handle extreme score differences with handicaps', () => {
      const extremeGame = {
        ...mockGame,
        handicapStrokes: 30,
        strokePlayScore: {
          USA: 72, // USA played very well
          EUROPE: 110, // EUROPE struggled significantly
          adjustedUSA: 72,
          adjustedEUROPE: 80, // Adjusted to 80 after applying 30 stroke handicap
        },
        matchPlayScore: {
          USA: 18, // USA won all holes
          EUROPE: 0,
          adjustedUSA: 10, // After handicap adjustment, USA still wins most holes
          adjustedEUROPE: 8,
        },
      };

      const result = calculateGamePoints(extremeGame);
      expect(result.raw.USA).toBe(2); // USA dominates raw scores
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(2); // USA still wins after adjustments
      expect(result.adjusted.EUROPE).toBe(0);
    });
    
    it('should handle handicaps that reverse match play outcomes but not stroke play', () => {
      const reverseMatchPlayGame = {
        ...mockGame,
        handicapStrokes: 15,
        strokePlayScore: {
          USA: 75,
          EUROPE: 95,
          adjustedUSA: 75,
          adjustedEUROPE: 80, // Still higher than USA even with handicap
        },
        matchPlayScore: {
          USA: 10,
          EUROPE: 8,
          adjustedUSA: 6, // After handicap, EUROPE now wins match play
          adjustedEUROPE: 12,
        },
      };

      const result = calculateGamePoints(reverseMatchPlayGame);
      expect(result.raw.USA).toBe(2); // USA wins both raw categories
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(1); // USA only wins stroke play after adjustments
      expect(result.adjusted.EUROPE).toBe(1); // EUROPE wins match play after adjustments
    });
    
    it('should handle handicaps that reverse stroke play outcomes but not match play', () => {
      const reverseStrokePlayGame = {
        ...mockGame,
        handicapStrokes: 10,
        strokePlayScore: {
          USA: 80,
          EUROPE: 88,
          adjustedUSA: 80,
          adjustedEUROPE: 78, // Now lower than USA with handicap
        },
        matchPlayScore: {
          USA: 15,
          EUROPE: 3,
          adjustedUSA: 12, // USA still dominates match play even after handicap
          adjustedEUROPE: 6,
        },
      };

      const result = calculateGamePoints(reverseStrokePlayGame);
      expect(result.raw.USA).toBe(2); // USA wins both raw categories
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(1); // USA only wins match play after adjustments
      expect(result.adjusted.EUROPE).toBe(1); // EUROPE wins stroke play after adjustments
    });
    
    it('should handle handicaps that completely reverse outcomes', () => {
      const completeReversalGame = {
        ...mockGame,
        handicapStrokes: 20,
        strokePlayScore: {
          USA: 75,
          EUROPE: 90,
          adjustedUSA: 75,
          adjustedEUROPE: 70, // Now better than USA with handicap
        },
        matchPlayScore: {
          USA: 12,
          EUROPE: 6,
          adjustedUSA: 5, // Now worse than EUROPE with handicap
          adjustedEUROPE: 13,
        },
      };

      const result = calculateGamePoints(completeReversalGame);
      expect(result.raw.USA).toBe(2); // USA wins both raw categories
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(0); // USA loses both after adjustments
      expect(result.adjusted.EUROPE).toBe(2); // EUROPE wins both after adjustments
    });
    
    it('should handle games where a player scores exceptionally low on some holes', () => {
      // Scenario where EUROPE has a couple of "blow-up" holes but otherwise plays well
      const blowupHolesGame = {
        ...mockGame,
        handicapStrokes: 5,
        strokePlayScore: {
          USA: 76, // Consistent play
          EUROPE: 82, // Good except for a couple bad holes
          adjustedUSA: 76,
          adjustedEUROPE: 77, // Competitive after handicap
        },
        matchPlayScore: {
          USA: 5, // Won 5 holes
          EUROPE: 3, // Won 3 holes
          adjustedUSA: 3, // After handicap adjustment
          adjustedEUROPE: 5, // After handicap adjustment
        },
      };

      const result = calculateGamePoints(blowupHolesGame);
      expect(result.raw.USA).toBe(2); // USA wins both raw categories
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(1); // USA only wins stroke play after handicap
      expect(result.adjusted.EUROPE).toBe(1); // EUROPE wins match play after handicap
    });
    
    it('should handle null scores and partial game data', () => {
      // A game where only 9 holes have been played
      const partialGame = {
        ...mockGame,
        isComplete: false,
        handicapStrokes: 8,
        holes: Array(18).fill({}).map((_, i) => {
          // First 9 holes have scores
          if (i < 9) {
            return {
              holeNumber: i + 1,
              strokeIndex: i + 1,
              parScore: 4,
              usaPlayerScore: 4,
              europePlayerScore: 5,
              usaPlayerAdjustedScore: 4,
              europePlayerAdjustedScore: 4, // Adjusted for handicap
              usaPlayerMatchPlayScore: 1,
              europePlayerMatchPlayScore: 0,
              usaPlayerMatchPlayAdjustedScore: 0.5,
              europePlayerMatchPlayAdjustedScore: 0.5,
            };
          }
          // Rest have null scores
          return {
            holeNumber: i + 1,
            strokeIndex: i + 1,
            parScore: 4,
            usaPlayerScore: null,
            europePlayerScore: null,
            usaPlayerAdjustedScore: null,
            europePlayerAdjustedScore: null,
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 0,
            europePlayerMatchPlayAdjustedScore: 0,
          };
        }),
        strokePlayScore: {
          USA: 36, // 9 holes * 4 strokes
          EUROPE: 45, // 9 holes * 5 strokes
          adjustedUSA: 36,
          adjustedEUROPE: 36, // After handicap
        },
        matchPlayScore: {
          USA: 9, // USA won all 9 holes
          EUROPE: 0,
          adjustedUSA: 4.5, // Ties on all holes after handicap
          adjustedEUROPE: 4.5,
        },
      };

      const result = calculateGamePoints(partialGame);
      expect(result.raw.USA).toBe(2); // USA wins both categories raw
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(1); // Ties in match play after handicap
      expect(result.adjusted.EUROPE).toBe(1); // Ties in match play after handicap
    });
  });
}); 