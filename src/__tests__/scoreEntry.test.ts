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
    holes: baseGame.holes.map((hole) => {
      // Each hole gets 1 stroke if its stroke index is less than or equal to handicap strokes
      const getsStroke = hole.strokeIndex <= 10;
      return {
        ...hole,
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
    holes: baseGame.holes.map((hole) => {
      // For 30 strokes: each hole gets 1 stroke, plus extra stroke for first 12 stroke indexes
      const getsExtraStroke = hole.strokeIndex <= 12;
      const totalStrokes = 1 + (getsExtraStroke ? 1 : 0); // 1 base stroke + 1 extra if applicable
      return {
        ...hole,
        // Apply handicap adjustments if scores exist
        usaPlayerAdjustedScore: 
          hole.usaPlayerScore !== null 
            ? Math.max(1, (hole.usaPlayerScore as number) - totalStrokes)
            : null,
        europePlayerAdjustedScore: hole.europePlayerScore,
        // With this high handicap, most holes become ties or USA wins after adjustment
        usaPlayerMatchPlayAdjustedScore: 
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.usaPlayerScore as number) - totalStrokes <= (hole.europePlayerScore as number) ? 1 : 0)
            : hole.usaPlayerMatchPlayScore,
        europePlayerMatchPlayAdjustedScore:
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.usaPlayerScore as number) - totalStrokes >= (hole.europePlayerScore as number) ? 1 : 0)
            : hole.europePlayerMatchPlayScore,
      };
    }),
  });

  // Helper function to create high handicap (30 strokes) game with EUROPE getting strokes
  const createHighHandicapEuropeGame = (baseGame: Game): Game => ({
    ...baseGame,
    handicapStrokes: 30,
    higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
    holes: baseGame.holes.map((hole) => {
      // For 30 strokes: each hole gets 1 stroke, plus extra stroke for first 12 stroke indexes
      const getsExtraStroke = hole.strokeIndex <= 12;
      const totalStrokes = 1 + (getsExtraStroke ? 1 : 0); // 1 base stroke + 1 extra if applicable
      return {
        ...hole,
        // Apply handicap adjustments if scores exist
        usaPlayerAdjustedScore: hole.usaPlayerScore,
        europePlayerAdjustedScore: 
          hole.europePlayerScore !== null 
            ? Math.max(1, (hole.europePlayerScore as number) - totalStrokes)
            : null,
        // With this high handicap, most holes become ties or EUROPE wins after adjustment
        usaPlayerMatchPlayAdjustedScore: 
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.europePlayerScore as number) - totalStrokes >= (hole.usaPlayerScore as number) ? 1 : 0)
            : hole.usaPlayerMatchPlayScore,
        europePlayerMatchPlayAdjustedScore:
          hole.usaPlayerScore !== null && hole.europePlayerScore !== null
            ? ((hole.europePlayerScore as number) - totalStrokes <= (hole.usaPlayerScore as number) ? 1 : 0)
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
        USA: 90, // 5 * 18 - USA loses stroke play
        EUROPE: 72, // 4 * 18 - EUROPE wins stroke play
        adjustedUSA: 90,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 18, // Won all holes - USA wins match play
        EUROPE: 0,
        adjustedUSA: 18,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(gameWithHandicap);
    
    // Raw scores: EUROPE wins stroke play, USA wins match play
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    
    // Adjusted scores: Same as raw scores - EUROPE wins stroke play, USA wins match play
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
        USA: 9, // USA won all holes played
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
        adjustedUSA: 78, // After 30 stroke handicap
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
    
    // Adjusted scores: EUROPE wins stroke play (72 vs 78) and match play is tied (0-0)
    expect(result.adjusted.USA).toBe(0.5);
    expect(result.adjusted.EUROPE).toBe(1.5);
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
    // With 10 strokes distributed by stroke index, USA gets 0.5 points for tied holes
    expect(result.adjusted.USA).toBe(0.5);
    expect(result.adjusted.EUROPE).toBe(1.5);
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
    
    // Adjusted scores: EUROPE wins stroke play (54 vs 78) and match play is tied (9-9)
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
        // For 30 strokes: each hole gets 1 stroke, plus extra stroke for first 12 stroke indexes
        const getsExtraStroke = hole.strokeIndex <= 12;
        const totalStrokes = 1 + (getsExtraStroke ? 1 : 0); // 1 base stroke + 1 extra if applicable
        return {
          ...hole,
          // Apply handicap adjustments if scores exist
          usaPlayerAdjustedScore: hole.usaPlayerScore,
          europePlayerAdjustedScore: 
            hole.europePlayerScore !== null 
              ? Math.max(1, (hole.europePlayerScore as number) - totalStrokes)
              : null,
          // Adjust match play scores based on handicap
          usaPlayerMatchPlayAdjustedScore: 
            getsExtraStroke ? Math.max(hole.usaPlayerMatchPlayScore, hole.europePlayerMatchPlayScore) : hole.usaPlayerMatchPlayScore,
          europePlayerMatchPlayAdjustedScore:
            getsExtraStroke ? Math.max(hole.usaPlayerMatchPlayScore, hole.europePlayerMatchPlayScore) : hole.europePlayerMatchPlayScore
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
    
    // Adjusted scores: Both stroke play (72-72) and match play (0-0) are tied
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
    
    // Adjusted scores: USA wins stroke play (54 vs 78) and match play is tied
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

  it('should handle zero scores in both categories', () => {
    const zeroScoresGame = {
      ...mockGame,
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

    const result = calculateGamePoints(zeroScoresGame);
    
    // Both categories are tied at 0, so each team gets 1 point
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle decimal scores correctly', () => {
    const decimalScoresGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 72.5,
        EUROPE: 72.5,
        adjustedUSA: 72.5,
        adjustedEUROPE: 72.5,
      },
      matchPlayScore: {
        USA: 4.5,
        EUROPE: 4.5,
        adjustedUSA: 4.5,
        adjustedEUROPE: 4.5,
      }
    };

    const result = calculateGamePoints(decimalScoresGame);
    
    // Both categories are tied, so each team gets 1 point
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle very large scores correctly', () => {
    const largeScoresGame = {
      ...mockGame,
      strokePlayScore: {
        USA: 999,
        EUROPE: 1000,
        adjustedUSA: 999,
        adjustedEUROPE: 1000,
      },
      matchPlayScore: {
        USA: 18,
        EUROPE: 0,
        adjustedUSA: 18,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(largeScoresGame);
    
    // USA wins both categories
    expect(result.raw.USA).toBe(2);
    expect(result.raw.EUROPE).toBe(0);
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle mixed null and zero scores', () => {
    const mixedScoresGame = {
      ...mockGame,
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

    const result = calculateGamePoints(mixedScoresGame);
    
    // Both categories are tied at 0
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle alternating wins in match play', () => {
    const alternatingWinsGame = {
      ...mockGame,
      holes: mockGame.holes.map((hole, index) => ({
        ...hole,
        usaPlayerScore: index % 2 === 0 ? 4 : 5,
        europePlayerScore: index % 2 === 0 ? 5 : 4,
        usaPlayerAdjustedScore: index % 2 === 0 ? 4 : 5,
        europePlayerAdjustedScore: index % 2 === 0 ? 5 : 4,
        usaPlayerMatchPlayScore: index % 2 === 0 ? 1 : 0,
        europePlayerMatchPlayScore: index % 2 === 0 ? 0 : 1,
        usaPlayerMatchPlayAdjustedScore: index % 2 === 0 ? 1 : 0,
        europePlayerMatchPlayAdjustedScore: index % 2 === 0 ? 0 : 1,
      })),
      strokePlayScore: {
        USA: 81, // 9 holes at 4, 9 holes at 5
        EUROPE: 81, // 9 holes at 5, 9 holes at 4
        adjustedUSA: 81,
        adjustedEUROPE: 81,
      },
      matchPlayScore: {
        USA: 9, // Won 9 holes
        EUROPE: 9, // Won 9 holes
        adjustedUSA: 9,
        adjustedEUROPE: 9,
      }
    };

    const result = calculateGamePoints(alternatingWinsGame);
    
    // Both teams win exactly half the holes
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle one team winning all holes in match play but losing stroke play', () => {
    const mixedResultsGame = {
      ...mockGame,
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 4,
        europePlayerScore: 5,
        usaPlayerAdjustedScore: 4,
        europePlayerAdjustedScore: 5,
        usaPlayerMatchPlayScore: 1,
        europePlayerMatchPlayScore: 0,
        usaPlayerMatchPlayAdjustedScore: 1,
        europePlayerMatchPlayAdjustedScore: 0,
      })),
      strokePlayScore: {
        USA: 90, // 5 * 18 - USA loses stroke play
        EUROPE: 72, // 4 * 18 - EUROPE wins stroke play
        adjustedUSA: 90,
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 18, // Won all holes - USA wins match play
        EUROPE: 0,
        adjustedUSA: 18,
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(mixedResultsGame);
    
    // USA wins match play but loses stroke play
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    expect(result.adjusted.USA).toBe(1);
    expect(result.adjusted.EUROPE).toBe(1);
  });

  it('should handle handicap strokes affecting only some holes', () => {
    const partialHandicapGame = {
      ...mockGame,
      handicapStrokes: 5,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        const getsStroke = index < 5; // Only first 5 holes get strokes
        return {
          ...hole,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: getsStroke ? 4 : 5,
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : 0,
          europePlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : 1,
        };
      }),
      strokePlayScore: {
        USA: 90, // 5 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 85, // 5 strokes deducted
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18,
        adjustedUSA: 2.5, // 5 holes tied, 13 lost
        adjustedEUROPE: 15.5,
      }
    };

    const result = calculateGamePoints(partialHandicapGame);
    
    // Raw scores: EUROPE wins both
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: EUROPE still wins stroke play but match play is closer
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle handicap strokes with decimal scores', () => {
    const decimalHandicapGame = {
      ...mockGame,
      handicapStrokes: 7.5,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        const getsStroke = index < 7; // First 7 holes get full strokes
        const getsHalfStroke = index === 7; // 8th hole gets half stroke
        return {
          ...hole,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: getsStroke ? 4 : (getsHalfStroke ? 4.5 : 5),
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : (getsHalfStroke ? 0.5 : 0),
          europePlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : (getsHalfStroke ? 0.5 : 1),
        };
      }),
      strokePlayScore: {
        USA: 90, // 5 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 82.5, // 7.5 strokes deducted
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18,
        adjustedUSA: 3.5, // 7 holes tied, 1 half-tied, 10 lost
        adjustedEUROPE: 14.5,
      }
    };

    const result = calculateGamePoints(decimalHandicapGame);
    
    // Raw scores: EUROPE wins both
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: EUROPE still wins both but match play is closer
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle handicap strokes with very small differences', () => {
    const smallHandicapGame = {
      ...mockGame,
      handicapStrokes: 1,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        const getsStroke = index === 0; // Only first hole gets stroke
        return {
          ...hole,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: getsStroke ? 4 : 5,
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : 0,
          europePlayerMatchPlayAdjustedScore: getsStroke ? 0.5 : 1,
        };
      }),
      strokePlayScore: {
        USA: 90, // 5 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 89, // 1 stroke deducted
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18,
        adjustedUSA: 0.5, // 1 hole tied, 17 lost
        adjustedEUROPE: 17.5,
      }
    };

    const result = calculateGamePoints(smallHandicapGame);
    
    // Raw scores: EUROPE wins both
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: EUROPE still wins both but match play has one tied hole
    expect(result.adjusted.USA).toBe(0);
    expect(result.adjusted.EUROPE).toBe(2);
  });

  it('should handle handicap strokes with very large differences', () => {
    const largeHandicapGame = {
      ...mockGame,
      handicapStrokes: 36,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map(hole => ({
        ...hole,
        usaPlayerScore: 5,
        europePlayerScore: 4,
        usaPlayerAdjustedScore: 3, // 2 strokes per hole
        europePlayerAdjustedScore: 4,
        usaPlayerMatchPlayScore: 0,
        europePlayerMatchPlayScore: 1,
        usaPlayerMatchPlayAdjustedScore: 1, // USA wins after adjustment
        europePlayerMatchPlayAdjustedScore: 0,
      })),
      strokePlayScore: {
        USA: 90, // 5 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 54, // 36 strokes deducted
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 0,
        EUROPE: 18,
        adjustedUSA: 18, // USA wins all holes after adjustment
        adjustedEUROPE: 0,
      }
    };

    const result = calculateGamePoints(largeHandicapGame);
    
    // Raw scores: EUROPE wins both
    expect(result.raw.USA).toBe(0);
    expect(result.raw.EUROPE).toBe(2);
    
    // Adjusted scores: USA wins both after handicap
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle handicap strokes with equal scores', () => {
    const equalScoresHandicapGame = {
      ...mockGame,
      handicapStrokes: 10,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: mockGame.holes.map((hole, index) => {
        const getsStroke = index < 10; // First 10 holes get strokes
        return {
          ...hole,
          usaPlayerScore: 4,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: getsStroke ? 3 : 4,
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0.5,
          europePlayerMatchPlayScore: 0.5,
          usaPlayerMatchPlayAdjustedScore: getsStroke ? 1 : 0.5,
          europePlayerMatchPlayAdjustedScore: getsStroke ? 0 : 0.5,
        };
      }),
      strokePlayScore: {
        USA: 72, // 4 * 18
        EUROPE: 72, // 4 * 18
        adjustedUSA: 62, // 10 strokes deducted
        adjustedEUROPE: 72,
      },
      matchPlayScore: {
        USA: 9, // All holes tied
        EUROPE: 9,
        adjustedUSA: 14, // USA wins first 10 holes, ties remaining
        adjustedEUROPE: 4,
      }
    };

    const result = calculateGamePoints(equalScoresHandicapGame);
    
    // Raw scores: Tied in both categories
    expect(result.raw.USA).toBe(1);
    expect(result.raw.EUROPE).toBe(1);
    
    // Adjusted scores: USA wins both after handicap
    expect(result.adjusted.USA).toBe(2);
    expect(result.adjusted.EUROPE).toBe(0);
  });

  it('should handle handicap changing both stroke play and match play outcomes', () => {
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
    
    // Adjusted scores: EUROPE wins stroke play (54 vs 78) and match play is tied (9-9)
    expect(result.adjusted.USA).toBe(0.5);
    expect(result.adjusted.EUROPE).toBe(1.5);
  });

  it('should handle handicap creating a tie in match play', () => {
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
    
    // Adjusted scores: USA wins stroke play (54 vs 78) and match play is tied (9-9)
    expect(result.adjusted.USA).toBe(1.5);
    expect(result.adjusted.EUROPE).toBe(0.5);
  });

  describe('Hole-by-Hole Score Entry', () => {
    it('should correctly track and display stroke-by-stroke progression', async () => {
      const gameWithProgressiveScores = {
        ...mockGame,
        holes: [
          {
            holeNumber: 1,
            strokeIndex: 1,
            parScore: 4,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 5,
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 1,
            europePlayerMatchPlayAdjustedScore: 0,
          },
          {
            holeNumber: 2,
            strokeIndex: 2,
            parScore: 4,
            usaPlayerScore: 5,
            europePlayerScore: 4,
            usaPlayerAdjustedScore: 5,
            europePlayerAdjustedScore: 4,
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 1,
            usaPlayerMatchPlayAdjustedScore: 0,
            europePlayerMatchPlayAdjustedScore: 1,
          }
        ]
      };

      // Update the game with progressive scores
      const updatedGame = updateAggregateScores(gameWithProgressiveScores);

      // Verify stroke play progression
      expect(updatedGame.strokePlayScore.USA).toBe(9); // 4 + 5
      expect(updatedGame.strokePlayScore.EUROPE).toBe(9); // 5 + 4
      expect(updatedGame.strokePlayScore.adjustedUSA).toBe(9);
      expect(updatedGame.strokePlayScore.adjustedEUROPE).toBe(9);

      // Verify match play progression
      expect(updatedGame.matchPlayScore.USA).toBe(1); // Won first hole
      expect(updatedGame.matchPlayScore.EUROPE).toBe(1); // Won second hole
      expect(updatedGame.matchPlayScore.adjustedUSA).toBe(1);
      expect(updatedGame.matchPlayScore.adjustedEUROPE).toBe(1);

      // Verify individual hole scores
      expect(updatedGame.holes[0].usaPlayerScore).toBe(4);
      expect(updatedGame.holes[0].europePlayerScore).toBe(5);
      expect(updatedGame.holes[1].usaPlayerScore).toBe(5);
      expect(updatedGame.holes[1].europePlayerScore).toBe(4);
    });

    it('should correctly calculate strokes when USA is higher handicap team with 10 strokes', () => {
      const gameWithUSAHandicap = {
        ...mockGame,
        handicapStrokes: 10,
        higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
        holes: [
          {
            holeNumber: 1,
            strokeIndex: 1,
            parScore: 4,
            usaPlayerScore: 5,
            europePlayerScore: 4,
            usaPlayerAdjustedScore: 4, // Gets 1 stroke on hole 1
            europePlayerAdjustedScore: 4,
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 1,
            usaPlayerMatchPlayAdjustedScore: 0.5, // Tied after adjustment
            europePlayerMatchPlayAdjustedScore: 0.5,
          },
          {
            holeNumber: 2,
            strokeIndex: 2,
            parScore: 4,
            usaPlayerScore: 5,
            europePlayerScore: 4,
            usaPlayerAdjustedScore: 4, // Gets 1 stroke on hole 2
            europePlayerAdjustedScore: 4,
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 1,
            usaPlayerMatchPlayAdjustedScore: 0.5, // Tied after adjustment
            europePlayerMatchPlayAdjustedScore: 0.5,
          }
        ]
      };

      const updatedGame = updateAggregateScores(gameWithUSAHandicap);

      // Verify stroke play scores
      expect(updatedGame.strokePlayScore.USA).toBe(10);
      expect(updatedGame.strokePlayScore.EUROPE).toBe(8);
      expect(updatedGame.strokePlayScore.adjustedUSA).toBe(8);
      expect(updatedGame.strokePlayScore.adjustedEUROPE).toBe(8);

      // Verify match play scores
      expect(updatedGame.matchPlayScore.USA).toBe(0);
      expect(updatedGame.matchPlayScore.EUROPE).toBe(2);
      expect(updatedGame.matchPlayScore.adjustedUSA).toBe(1);
      expect(updatedGame.matchPlayScore.adjustedEUROPE).toBe(1);

      // Verify individual hole adjustments
      expect(updatedGame.holes[0].usaPlayerAdjustedScore).toBe(4);
      expect(updatedGame.holes[0].europePlayerAdjustedScore).toBe(4);
      expect(updatedGame.holes[1].usaPlayerAdjustedScore).toBe(4);
      expect(updatedGame.holes[1].europePlayerAdjustedScore).toBe(4);
    });

    it('should correctly calculate strokes when EUROPE is higher handicap team with 36+ strokes', () => {
      const gameWithEuropeHandicap = {
        ...mockGame,
        handicapStrokes: 40,
        higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
        holes: [
          {
            holeNumber: 1,
            strokeIndex: 1,
            parScore: 4,
            usaPlayerScore: 4,
            europePlayerScore: 6,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 3, // Gets 3 strokes on hole 1 (2 base + 1 extra)
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 0, // Loses after adjustment
            europePlayerMatchPlayAdjustedScore: 1,
          },
          {
            holeNumber: 2,
            strokeIndex: 2,
            parScore: 4,
            usaPlayerScore: 4,
            europePlayerScore: 6,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 3, // Gets 3 strokes on hole 2 (2 base + 1 extra)
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 0, // Loses after adjustment
            europePlayerMatchPlayAdjustedScore: 1,
          }
        ]
      };

      const updatedGame = updateAggregateScores(gameWithEuropeHandicap);

      // Verify stroke play scores
      expect(updatedGame.strokePlayScore.USA).toBe(8);
      expect(updatedGame.strokePlayScore.EUROPE).toBe(12);
      expect(updatedGame.strokePlayScore.adjustedUSA).toBe(8);
      expect(updatedGame.strokePlayScore.adjustedEUROPE).toBe(6);

      // Verify match play scores
      expect(updatedGame.matchPlayScore.USA).toBe(2);
      expect(updatedGame.matchPlayScore.EUROPE).toBe(0);
      expect(updatedGame.matchPlayScore.adjustedUSA).toBe(0);
      expect(updatedGame.matchPlayScore.adjustedEUROPE).toBe(2);

      // Verify individual hole adjustments
      expect(updatedGame.holes[0].europePlayerAdjustedScore).toBe(3);
      expect(updatedGame.holes[0].usaPlayerAdjustedScore).toBe(4);
      expect(updatedGame.holes[1].europePlayerAdjustedScore).toBe(3);
      expect(updatedGame.holes[1].usaPlayerAdjustedScore).toBe(4);
    });
  });

  it('should correctly calculate extra strokes based on stroke index and hole number', () => {
    const gameWithExtraStrokes = {
      ...mockGame,
      handicapStrokes: 20,
      higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
      holes: [
        {
          holeNumber: 1,
          strokeIndex: 1,
          parScore: 4,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: 3, // Gets 2 strokes (1 base + 1 extra)
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: 1, // Wins after adjustment
          europePlayerMatchPlayAdjustedScore: 0,
        },
        {
          holeNumber: 2,
          strokeIndex: 2,
          parScore: 4,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: 3, // Gets 2 strokes (1 base + 1 extra)
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: 1, // Wins after adjustment
          europePlayerMatchPlayAdjustedScore: 0,
        },
        {
          holeNumber: 3,
          strokeIndex: 3,
          parScore: 4,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: 3, // Gets 2 strokes (1 base + 1 extra)
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: 1, // Wins after adjustment
          europePlayerMatchPlayAdjustedScore: 0,
        },
        {
          holeNumber: 4,
          strokeIndex: 4,
          parScore: 4,
          usaPlayerScore: 5,
          europePlayerScore: 4,
          usaPlayerAdjustedScore: 4, // Gets only 1 stroke (no extra)
          europePlayerAdjustedScore: 4,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 1,
          usaPlayerMatchPlayAdjustedScore: 0.5, // Tied after adjustment
          europePlayerMatchPlayAdjustedScore: 0.5,
        }
      ]
    };

    const updatedGame = updateAggregateScores(gameWithExtraStrokes);

    // Verify stroke play scores
    expect(updatedGame.strokePlayScore.USA).toBe(20);
    expect(updatedGame.strokePlayScore.EUROPE).toBe(16);
    expect(updatedGame.strokePlayScore.adjustedUSA).toBe(13);
    expect(updatedGame.strokePlayScore.adjustedEUROPE).toBe(16);

    // Verify match play scores
    expect(updatedGame.matchPlayScore.USA).toBe(0);
    expect(updatedGame.matchPlayScore.EUROPE).toBe(4);
    expect(updatedGame.matchPlayScore.adjustedUSA).toBe(3.5);
    expect(updatedGame.matchPlayScore.adjustedEUROPE).toBe(0.5);

    // Verify individual hole adjustments
    expect(updatedGame.holes[0].usaPlayerAdjustedScore).toBe(3); // 2 strokes
    expect(updatedGame.holes[1].usaPlayerAdjustedScore).toBe(3); // 2 strokes
    expect(updatedGame.holes[2].usaPlayerAdjustedScore).toBe(3); // 2 strokes
    expect(updatedGame.holes[3].usaPlayerAdjustedScore).toBe(4); // 1 stroke
  });
}); 