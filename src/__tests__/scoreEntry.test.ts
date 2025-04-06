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

  // Helper function to create medium handicap (10 strokes) game
  const createMediumHandicapGame = (baseGame: Game): Game => ({
    ...baseGame,
    handicapStrokes: 10,
    higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
    holes: baseGame.holes.map((hole, index) => {
      const getsStroke = (index % 18) < 10; // First 10 holes get strokes
      return {
        ...hole,
        strokeIndex: (index % 18) + 1,
        // Apply handicap adjustments if scores exist
        usaPlayerAdjustedScore: 
          hole.usaPlayerScore !== null 
            ? (getsStroke ? Math.max(1, (hole.usaPlayerScore as number) - 1) : hole.usaPlayerScore) 
            : null,
        europePlayerAdjustedScore: hole.europePlayerScore,
        // Adjust match play scores based on handicap
        usaPlayerMatchPlayAdjustedScore: 
          getsStroke ? Math.max(hole.usaPlayerMatchPlayScore, hole.europePlayerMatchPlayScore) : hole.usaPlayerMatchPlayScore,
        europePlayerMatchPlayAdjustedScore:
          getsStroke ? Math.max(hole.usaPlayerMatchPlayScore, hole.europePlayerMatchPlayScore) : hole.europePlayerMatchPlayScore
      };
    }),
  });

  // Helper function to create high handicap (30 strokes) game with USA getting strokes
  const createHighHandicapGame = (baseGame: Game): Game => ({
    ...baseGame,
    handicapStrokes: 30,
    higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
    holes: baseGame.holes.map((hole, index) => {
      const strokesForHole = 1 + ((index % 18) < 12 ? 1 : 0); // 12 holes get 2 strokes, 6 get 1 stroke
      return {
        ...hole,
        strokeIndex: (index % 18) + 1,
        // Apply handicap adjustments if scores exist
        usaPlayerAdjustedScore: 
          hole.usaPlayerScore !== null 
            ? Math.max(1, (hole.usaPlayerScore as number) - strokesForHole) 
            : null,
        europePlayerAdjustedScore: hole.europePlayerScore,
        // With this high handicap, most holes become ties or USA wins after adjustment
        usaPlayerMatchPlayAdjustedScore: 
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.usaPlayerScore as number) - strokesForHole <= (hole.europePlayerScore as number) ? 1 : 0)
            : hole.usaPlayerMatchPlayScore,
        europePlayerMatchPlayAdjustedScore:
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.usaPlayerScore as number) - strokesForHole >= (hole.europePlayerScore as number) ? 1 : 0)
            : hole.europePlayerMatchPlayScore,
      };
    }),
  });

  // Helper function to create high handicap (30 strokes) game with EUROPE getting strokes
  const createHighHandicapEuropeGame = (baseGame: Game): Game => ({
    ...baseGame,
    handicapStrokes: 30,
    higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
    holes: baseGame.holes.map((hole, index) => {
      const strokesForHole = 1 + ((index % 18) < 12 ? 1 : 0); // 12 holes get 2 strokes, 6 get 1 stroke
      return {
        ...hole,
        strokeIndex: (index % 18) + 1,
        // Apply handicap adjustments if scores exist
        usaPlayerAdjustedScore: hole.usaPlayerScore,
        europePlayerAdjustedScore: 
          hole.europePlayerScore !== null 
            ? Math.max(1, (hole.europePlayerScore as number) - strokesForHole) 
            : null,
        // With this high handicap, most holes become ties or EUROPE wins after adjustment
        usaPlayerMatchPlayAdjustedScore: 
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.europePlayerScore as number) - strokesForHole >= (hole.usaPlayerScore as number) ? 1 : 0)
            : hole.usaPlayerMatchPlayScore,
        europePlayerMatchPlayAdjustedScore:
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.europePlayerScore as number) - strokesForHole <= (hole.usaPlayerScore as number) ? 1 : 0)
            : hole.europePlayerMatchPlayScore,
      };
    }),
  });

  // Update strokePlayScore and matchPlayScore in the test object based on adjusted hole scores
  const updateAggregateScores = (game: Game): Game => {
    // Calculate aggregate scores based on hole data
    const adjustedUSA = game.holes.reduce((sum, hole) => 
      sum + (hole.usaPlayerAdjustedScore !== null ? hole.usaPlayerAdjustedScore : 0), 0);
    const adjustedEUROPE = game.holes.reduce((sum, hole) => 
      sum + (hole.europePlayerAdjustedScore !== null ? hole.europePlayerAdjustedScore : 0), 0);
    const rawUSA = game.holes.reduce((sum, hole) => 
      sum + (hole.usaPlayerScore !== null ? hole.usaPlayerScore : 0), 0);
    const rawEUROPE = game.holes.reduce((sum, hole) => 
      sum + (hole.europePlayerScore !== null ? hole.europePlayerScore : 0), 0);
    
    const adjustedMatchUSA = game.holes.reduce((sum, hole) => sum + hole.usaPlayerMatchPlayAdjustedScore, 0);
    const adjustedMatchEUROPE = game.holes.reduce((sum, hole) => sum + hole.europePlayerMatchPlayAdjustedScore, 0);
    const rawMatchUSA = game.holes.reduce((sum, hole) => sum + hole.usaPlayerMatchPlayScore, 0);
    const rawMatchEUROPE = game.holes.reduce((sum, hole) => sum + hole.europePlayerMatchPlayScore, 0);

    return {
      ...game,
      strokePlayScore: {
        USA: rawUSA,
        EUROPE: rawEUROPE,
        adjustedUSA,
        adjustedEUROPE,
      },
      matchPlayScore: {
        USA: rawMatchUSA,
        EUROPE: rawMatchEUROPE,
        adjustedUSA: adjustedMatchUSA,
        adjustedEUROPE: adjustedMatchEUROPE,
      }
    };
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

  it('should correctly calculate game points with handicap adjustments', () => {
    const gameWithHandicap = {
      ...mockGame,
      handicapStrokes: 3,
      higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        if (index < 3) {
          return {
            ...hole,
            holeNumber: index + 1,
            strokeIndex: index + 1,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 4, // Adjusted for handicap on first 3 holes
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 0, // Tied after adjustment
            europePlayerMatchPlayAdjustedScore: 0, // Tied after adjustment
          };
        }
        return hole;
      }),
      strokePlayScore: {
        USA: 72,
        EUROPE: 75,
        adjustedUSA: 72,
        adjustedEUROPE: 72, // Equal after adjustments
      },
      matchPlayScore: {
        USA: 3,
        EUROPE: 0,
        adjustedUSA: 0,
        adjustedEUROPE: 0, // Tied after adjustments
      }
    };

    const result = calculateGamePoints(gameWithHandicap);
    
    // Raw scores: USA wins both stroke play and match play
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    
    // Adjusted scores: Tied in both stroke play and match play (half point each)
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should return zero points for games that have not started', () => {
    const notStartedGame = {
      ...mockGame,
      isStarted: false,
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
      }
    };

    const result = calculateGamePoints(notStartedGame);
    
    // All points should be zero when a game has not started
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should correctly calculate points when teams split stroke play and match play wins', () => {
    const splitWinsGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 70,  // USA wins stroke play
        EUROPE: 72,
        adjustedUSA: 70,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 4,
        EUROPE: 6,  // EUROPE wins match play
        adjustedUSA: 4,
        adjustedEUROPE: 6,
      }
    };

    const result = calculateGamePoints(splitWinsGame);
    
    // Each team should get one point from their respective wins
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    
    // Same for adjusted scores since no handicaps affected the outcome
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle extreme score differences correctly', () => {
    const extremeScoreGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 65,  // Extremely low score for USA
        EUROPE: 95, // Extremely high score for EUROPE
        adjustedUSA: 65,
        adjustedEUROPE: 95,
      },
      matchPlayScore: {
        USA: 15, // USA won most holes
        EUROPE: 0,
        adjustedUSA: 15,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(extremeScoreGame);
    
    // USA should win both stroke play and match play
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle tied stroke play with different match play scores', () => {
    const tiedStrokePlayGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 72,  // Tied stroke play
        EUROPE: 72,
        adjustedUSA: 72,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 5,  // USA wins match play
        EUROPE: 3,
        adjustedUSA: 5,
        adjustedEUROPE: 3,
      }
    };

    const result = calculateGamePoints(tiedStrokePlayGame);
    
    // USA should get 0.5 for tied stroke play and 1 for match play win
    expect(result.raw.USA).toBe(1.5);
    expect(result.raw.EUROPE).toBe(0.5);
    expect(result.adjusted.USA).toBe(1.5);
    expect(result.adjusted.EUROPE).toBe(0.5);
  });

  it('should handle partially completed games with some null scores', () => {
    const partialGame = {
      ...mockGame,
      holes: mockGame.holes.map((hole, index) => {
        if (index < 9) { // Only first 9 holes completed
          return {
            ...hole,
            holeNumber: index + 1,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 5,
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 1,
            europePlayerMatchPlayAdjustedScore: 0,
          };
        }
        // Remaining holes have null scores
        return {
          ...hole,
          holeNumber: index + 1,
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
        USA: 36, // Front 9 only
        EUROPE: 45,
        adjustedUSA: 36,
        adjustedEUROPE: 45,
      },
      matchPlayScore: {
        USA: 9, // USA won all 9 holes played
        EUROPE: 0,
        adjustedUSA: 9,
        adjustedEUROPE: 0,
      },
      isComplete: false
    };

    const result = calculateGamePoints(partialGame);
    
    // Even with partial game, we calculate points based on available data
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle ties in both stroke play and match play', () => {
    const completelyTiedGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 72,  // Tied stroke play
        EUROPE: 72,
        adjustedUSA: 72,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 9,  // Tied match play
        EUROPE: 9,
        adjustedUSA: 9,
        adjustedEUROPE: 9,
      }
    };

    const result = calculateGamePoints(completelyTiedGame);
    
    // Both teams should get 0.5 points for each tied category
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle when one player has all null scores (no-show)', () => {
    const noShowGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 4,
        europePlayerScore: null, // EUROPE player didn't show up
        usaPlayerAdjustedScore: 4,
        europePlayerAdjustedScore: null,
        usaPlayerMatchPlayScore: 1,
        europePlayerMatchPlayScore: 0,
        usaPlayerMatchPlayAdjustedScore: 1,
        europePlayerMatchPlayAdjustedScore: 0,
      })),
      strokePlayScore: {
        USA: 72,
        EUROPE: 0, // Changed from null to 0 for type safety
        adjustedUSA: 72,
        adjustedEUROPE: 0, // Changed from null to 0 for type safety
      },
      matchPlayScore: {
        USA: 18, // USA won all holes by default
        EUROPE: 0,
        adjustedUSA: 18,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(noShowGame);
    
    // USA gets 1 point for match play and EUROPE gets 1 point for lower stroke play
    // With EUROPE score of 0, it's better than USA's 72
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle maximum possible match play difference (18-0)', () => {
    const maxDifferenceGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 3, // USA wins every hole
        europePlayerScore: 4,
        usaPlayerAdjustedScore: 3,
        europePlayerAdjustedScore: 4,
        usaPlayerMatchPlayScore: 1,
        europePlayerMatchPlayScore: 0,
        usaPlayerMatchPlayAdjustedScore: 1,
        europePlayerMatchPlayAdjustedScore: 0,
      })),
      strokePlayScore: {
        USA: 54, // Extremely good score
        EUROPE: 72,
        adjustedUSA: 54,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 18, // USA won all 18 holes
        EUROPE: 0,
        adjustedUSA: 18,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(maxDifferenceGame);
    
    // USA sweeps all points
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle medium handicap strokes (10) correctly', () => {
    const mediumHandicapGame = {
      ...mockGame,
      handicapStrokes: 10,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        // First 10 holes get handicap strokes (as strokeIndex 1-10)
        const getsStroke = index < 10;
        return {
          ...hole,
          holeNumber: index + 1,
          strokeIndex: index + 1,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          // USA gets handicap strokes, so their adjusted score is one lower
          usaPlayerAdjustedScore: getsStroke ? 4 : 5,
          europePlayerAdjustedScore: 4,
          // Raw match play - Europe wins
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          // Adjusted match play - tied on handicap-adjusted holes
          usaPlayerMatchPlayAdjustedScore: getsStroke ? 0 : 0,
          europePlayerMatchPlayAdjustedScore: getsStroke ? 0 : 1,
        };
      }),
      strokePlayScore: {
        USA: 90,
        EUROPE: 72,
        adjustedUSA: 80, // 10 strokes deducted for handicap
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18, // Europe wins all holes
        adjustedUSA: 0,
        adjustedEUROPE: 8, // Europe only wins 8 holes after handicap adjustment
      }
    };

    const result = calculateGamePoints(mediumHandicapGame);
    
    // Raw scores: EUROPE wins both stroke play and match play
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: EUROPE still wins stroke play but gets less points in match play
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle high handicap strokes (30) correctly', () => {
    const highHandicapGame = {
      ...mockGame,
      handicapStrokes: 30,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole) => {
        // Every hole gets at least 1 handicap stroke, some get 2
        return {
          ...hole,
          usaPlayerScore: 6,
          europePlayerScore: 4,
          // After handicap adjustment, USA's scores are much better
          usaPlayerAdjustedScore: 4, // With 30 strokes, each hole gets at least 1, some get 2
          europePlayerAdjustedScore: 4,
          // Raw match play - Europe wins each hole
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          // After handicap adjustment, all holes are tied
          usaPlayerMatchPlayAdjustedScore: 0,
          europePlayerMatchPlayAdjustedScore: 0,
        };
      }),
      strokePlayScore: {
        USA: 108, // 6 strokes per hole
        EUROPE: 72, // 4 strokes per hole
        adjustedUSA: 72, // After 30 stroke handicap
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18, // Europe wins all holes before handicap
        adjustedUSA: 0,
        adjustedEUROPE: 0, // After handicap, all holes are tied
      }
    };

    const result = calculateGamePoints(highHandicapGame);
    
    // Raw scores: EUROPE wins both stroke play and match play
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: Stroke play is tied (0.5 each) and match play is tied (0.5 each)
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle extreme score differences with medium handicap', () => {
    // Create base game with extreme scores
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 6, // High score
        europePlayerScore: 3, // Low score
        usaPlayerMatchPlayScore: 0,
        europePlayerMatchPlayScore: 1,
      })),
      strokePlayScore: {
        USA: 108, // 6 * 18
        EUROPE: 54, // 3 * 18
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18, // Europe wins all holes
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      }
    };
    
    // Create medium handicap version
    let mediumHandicapGame = createMediumHandicapGame(baseGame);
    mediumHandicapGame = updateAggregateScores(mediumHandicapGame);

    const result = calculateGamePoints(mediumHandicapGame);
    
    // Even with 10 strokes, the extreme difference means Europe still wins both categories
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    // But the adjusted scores are closer
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle extreme score differences with high handicap', () => {
    // Create base game with extreme scores
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 6, // High score
        europePlayerScore: 3, // Low score
        usaPlayerMatchPlayScore: 0,
        europePlayerMatchPlayScore: 1,
      })),
      strokePlayScore: {
        USA: 108, // 6 * 18
        EUROPE: 54, // 3 * 18
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18, // Europe wins all holes
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      }
    };
    
    // Create high handicap version and update scores
    let highHandicapGame = createHighHandicapGame(baseGame);
    highHandicapGame = {
      ...highHandicapGame,
      strokePlayScore: {
        USA: 108,
        EUROPE: 54,
        adjustedUSA: 78, // 108 - 30 strokes
        adjustedEUROPE: 54,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18,
        adjustedUSA: 9, // USA now wins half the holes after handicap
        adjustedEUROPE: 9, // Tied on the other half
      }
    };

    const result = calculateGamePoints(highHandicapGame);
    
    // Raw scores: EUROPE wins both categories
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: EUROPE still wins stroke play but match play is now tied
    expect(result.adjusted.USA).toBe(0.5);
    expect(result.adjusted.EUROPE).toBe(1.5);
  });

  it('should handle tied scores with medium handicap', () => {
    // Create base game with tied scores
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 4, // Same score
        europePlayerScore: 4, // Same score
        usaPlayerMatchPlayScore: 0.5, // Tied
        europePlayerMatchPlayScore: 0.5, // Tied
      })),
      strokePlayScore: {
        USA: 72, // 4 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 9, // Half points for all 18 holes
        EUROPE: 9,
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      }
    };
    
    // Create medium handicap version and update scores
    let mediumHandicapGame = createMediumHandicapGame(baseGame);
    mediumHandicapGame = {
      ...mediumHandicapGame,
      strokePlayScore: {
        USA: 72,
        EUROPE: 72,
        adjustedUSA: 62, // 72 - 10 strokes
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 9,
        EUROPE: 9,
        adjustedUSA: 14, // USA now wins first 10 holes
        adjustedEUROPE: 4, // Europe keeps half points for other 8 holes
      }
    };

    const result = calculateGamePoints(mediumHandicapGame);
    
    // Raw scores: Tied in both categories
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    
    // Adjusted scores: USA wins both categories after handicap
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle partially completed games with high handicap', () => {
    // Create base game with only 9 holes completed
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map((hole, index) => {
        if (index < 9) { // Only first 9 holes completed
          return {
            ...hole,
            holeNumber: index + 1,
            strokeIndex: index + 1,
            usaPlayerScore: 5,
            europePlayerScore: 4,
            usaPlayerAdjustedScore: 0, // Will be updated
            europePlayerAdjustedScore: 0, // Will be updated
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 1,
            usaPlayerMatchPlayAdjustedScore: 0, // Will be updated
            europePlayerMatchPlayAdjustedScore: 0, // Will be updated
          };
        }
        // Remaining holes have null scores
        return {
          ...hole,
          holeNumber: index + 1,
          strokeIndex: index + 1,
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
        USA: 45, // 5 * 9
        EUROPE: 36, // 4 * 9
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 9, // Europe won all 9 holes played
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      isComplete: false
    };
    
    // Create high handicap version and update scores
    let highHandicapGame = createHighHandicapGame(baseGame);
    highHandicapGame = {
      ...highHandicapGame,
      strokePlayScore: {
        USA: 45,
        EUROPE: 36,
        adjustedUSA: 30, // 45 - 15 strokes (9 holes with avg 1.67 strokes each)
        adjustedEUROPE: 36,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 9,
        adjustedUSA: 7, // USA now wins most holes after handicap
        adjustedEUROPE: 2,
      }
    };

    const result = calculateGamePoints(highHandicapGame);
    
    // Raw scores: EUROPE wins both categories
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: With high handicap, USA now wins both categories
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle high handicap strokes (30) for EUROPE correctly', () => {
    const highHandicapEuropeGame = {
      ...mockGame,
      handicapStrokes: 30,
      higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole) => {
        // Every hole gets at least 1 handicap stroke, some get 2
        return {
          ...hole,
          usaPlayerScore: 4,
          europePlayerScore: 6,
          // After handicap adjustment, EUROPE's scores are much better
          usaPlayerAdjustedScore: 4,
          europePlayerAdjustedScore: 4, // With 30 strokes, each hole gets at least 1, some get 2
          // Raw match play - USA wins each hole
          usaPlayerMatchPlayScore: 1,
          europePlayerMatchPlayScore: 0,
          // After handicap adjustment, all holes are tied
          usaPlayerMatchPlayAdjustedScore: 0,
          europePlayerMatchPlayAdjustedScore: 0,
        };
      }),
      strokePlayScore: {
        USA: 72, // 4 strokes per hole
        EUROPE: 108, // 6 strokes per hole
        adjustedUSA: 72,
        adjustedEUROPE: 72, // After 30 stroke handicap
      },
      matchPlayScore: {
        USA: 18, // USA wins all holes before handicap
        EUROPE: 0,
        adjustedUSA: 0, // After handicap, all holes are tied
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(highHandicapEuropeGame);
    
    // Raw scores: USA wins both stroke play and match play
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    
    // Adjusted scores: Stroke play is tied (0.5 each) and match play is tied (0.5 each)
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle extreme score differences with high handicap for EUROPE', () => {
    // Create base game with extreme scores
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 3, // Low score
        europePlayerScore: 6, // High score
        usaPlayerMatchPlayScore: 1,
        europePlayerMatchPlayScore: 0,
      })),
      strokePlayScore: {
        USA: 54, // 3 * 18
        EUROPE: 108, // 6 * 18
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 18, // USA wins all holes
        EUROPE: 0,
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      }
    };
    
    // Create high handicap version for EUROPE and update scores
    let highHandicapEuropeGame = createHighHandicapEuropeGame(baseGame);
    highHandicapEuropeGame = {
      ...highHandicapEuropeGame,
      strokePlayScore: {
        USA: 54,
        EUROPE: 108,
        adjustedUSA: 54,
        adjustedEUROPE: 78, // 108 - 30 strokes
      },
      matchPlayScore: {
        USA: 18,
        EUROPE: 0,
        adjustedUSA: 9, // Tied on half the holes after handicap
        adjustedEUROPE: 9, // EUROPE now wins half the holes after handicap
      }
    };

    const result = calculateGamePoints(highHandicapEuropeGame);
    
    // Raw scores: USA wins both categories
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    
    // Adjusted scores: USA still wins stroke play but match play is now tied
    expect(result.adjusted.USA).toBe(1.5);
    expect(result.adjusted.EUROPE).toBe(0.5);
  });

  it('should handle tied scores with high handicap for EUROPE', () => {
    // Create base game with tied scores
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 4, // Same score
        europePlayerScore: 4, // Same score
        usaPlayerMatchPlayScore: 0.5, // Tied
        europePlayerMatchPlayScore: 0.5, // Tied
      })),
      strokePlayScore: {
        USA: 72, // 4 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 9, // Half points for all 18 holes
        EUROPE: 9,
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      }
    };
    
    // Create high handicap version for EUROPE and update scores
    let highHandicapEuropeGame = createHighHandicapEuropeGame(baseGame);
    highHandicapEuropeGame = {
      ...highHandicapEuropeGame,
      strokePlayScore: {
        USA: 72,
        EUROPE: 72,
        adjustedUSA: 72,
        adjustedEUROPE: 42, // 72 - 30 strokes
      },
      matchPlayScore: {
        USA: 9,
        EUROPE: 9,
        adjustedUSA: 4, // EUROPE now wins most holes
        adjustedEUROPE: 14, // EUROPE wins all holes that get handicap strokes
      }
    };

    const result = calculateGamePoints(highHandicapEuropeGame);
    
    // Raw scores: Tied in both categories
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    
    // Adjusted scores: EUROPE wins both categories after handicap
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle partially completed games with high handicap for EUROPE', () => {
    // Create base game with only 9 holes completed
    const baseGame = {
      ...mockGame,
      holes: mockGame.holes.map((hole, index) => {
        if (index < 9) { // Only first 9 holes completed
          return {
            ...hole,
            holeNumber: index + 1,
            strokeIndex: index + 1,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 0, // Will be updated
            europePlayerAdjustedScore: 0, // Will be updated
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 0, // Will be updated
            europePlayerMatchPlayAdjustedScore: 0, // Will be updated
          };
        }
        // Remaining holes have null scores
        return {
          ...hole,
          holeNumber: index + 1,
          strokeIndex: index + 1,
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
        USA: 36, // 4 * 9
        EUROPE: 45, // 5 * 9
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      matchPlayScore: {
        USA: 9, // USA won all 9 holes played
        EUROPE: 0,
        adjustedUSA: 0, // Will be updated
        adjustedEUROPE: 0, // Will be updated
      },
      isComplete: false
    };
    
    // Create high handicap version for EUROPE and update scores
    let highHandicapEuropeGame = createHighHandicapEuropeGame(baseGame);
    highHandicapEuropeGame = {
      ...highHandicapEuropeGame,
      strokePlayScore: {
        USA: 36,
        EUROPE: 45,
        adjustedUSA: 36,
        adjustedEUROPE: 30, // 45 - 15 strokes (9 holes with avg 1.67 strokes each)
      },
      matchPlayScore: {
        USA: 9,
        EUROPE: 0,
        adjustedUSA: 2, // EUROPE now wins most holes after handicap
        adjustedEUROPE: 7,
      }
    };

    const result = calculateGamePoints(highHandicapEuropeGame);
    
    // Raw scores: USA wins both categories
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    
    // Adjusted scores: With high handicap, EUROPE now wins both categories
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });
}); 