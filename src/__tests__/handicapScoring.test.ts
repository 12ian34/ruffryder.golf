import { describe, it, expect } from 'vitest';
import { calculateHandicapAdjustedScores, calculateAverageTeamHandicaps } from '../utils/handicapScoring';
import type { Game } from '../types/game';
import type { Player } from '../types/player';

describe('Handicap Scoring Tests', () => {
  const createMockGame = (handicapStrokes: number, higherHandicapTeam: 'USA' | 'EUROPE'): Game => ({
    id: 'game1',
    tournamentId: 'tournament1',
    usaPlayerId: 'p1',
    usaPlayerName: 'Player1',
    europePlayerId: 'p2',
    europePlayerName: 'Player2',
    handicapStrokes,
    higherHandicapTeam,
    holes: [],
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
  });

  describe('No handicap adjustments', () => {
    it('should return unadjusted scores when no handicap strokes are given', () => {
      const game = createMockGame(0, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 4, europeScore: 5 }
      );

      expect(result.usaAdjustedScore).toBe(4);
      expect(result.europeAdjustedScore).toBe(5);
      expect(result.usaMatchPlayScore).toBe(1);
      expect(result.europeMatchPlayScore).toBe(0);
      expect(result.usaMatchPlayAdjustedScore).toBe(1);
      expect(result.europeMatchPlayAdjustedScore).toBe(0);
    });

    it('should handle null scores properly', () => {
      const game = createMockGame(0, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: null, europeScore: 5 }
      );

      expect(result.usaAdjustedScore).toBeNull();
      expect(result.europeAdjustedScore).toBe(5);
      expect(result.usaMatchPlayScore).toBe(0);
      expect(result.europeMatchPlayScore).toBe(0);
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0);
    });
  });

  describe('USA with higher handicap', () => {
    it('should correctly apply single handicap stroke for USA on a low index hole', () => {
      const game = createMockGame(1, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 4 }
      );

      expect(result.usaAdjustedScore).toBe(5);
      expect(result.europeAdjustedScore).toBe(5); // Europe gets 1 stroke added
      expect(result.usaMatchPlayScore).toBe(0);
      expect(result.europeMatchPlayScore).toBe(1);
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should correctly apply handicap strokes for USA that change match outcome', () => {
      const game = createMockGame(10, 'USA');
      
      // Testing on hole with stroke index 5 (should receive a stroke)
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 5 },
        { usaScore: 5, europeScore: 4 }
      );

      expect(result.usaAdjustedScore).toBe(5);
      expect(result.europeAdjustedScore).toBe(5); // Europe gets 1 stroke added
      expect(result.usaMatchPlayScore).toBe(0);
      expect(result.europeMatchPlayScore).toBe(1);
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should correctly handle high handicap distribution across holes', () => {
      const game = createMockGame(20, 'USA');
      
      // First stroke index hole gets more strokes
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 4 }
      );
      
      // Due to base 1 stroke (20/18) + extra stroke (stroke index <= 2)
      expect(result1.europeAdjustedScore).toBe(6); // Europe gets 2 strokes
      expect(result1.usaMatchPlayAdjustedScore).toBe(1); // USA wins after adjustment
      expect(result1.europeMatchPlayAdjustedScore).toBe(0);
      
      // Higher stroke index hole gets fewer strokes
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 18 },
        { usaScore: 5, europeScore: 4 }
      );
      
      // Due to base 1 stroke (20/18) only, no extra
      expect(result2.europeAdjustedScore).toBe(5); // Europe gets 1 stroke
      expect(result2.usaMatchPlayAdjustedScore).toBe(0);
      expect(result2.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should correctly handle handicap strokes above 36', () => {
      const game = createMockGame(40, 'USA');
      
      // First stroke index hole gets 3 strokes (base 2 + extra 1)
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 4 }
      );
      
      // Base 2 strokes (40/18) + extra stroke (stroke index <= 4)
      expect(result1.europeAdjustedScore).toBe(7); // Europe gets 3 strokes
      expect(result1.usaMatchPlayAdjustedScore).toBe(1); // USA wins because 5 < 7
      expect(result1.europeMatchPlayAdjustedScore).toBe(0);
      
      // Middle stroke index hole gets 2 strokes
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 10 },
        { usaScore: 5, europeScore: 4 }
      );
      
      // Base 2 strokes only
      expect(result2.europeAdjustedScore).toBe(6); // Europe gets 2 strokes
      expect(result2.usaMatchPlayAdjustedScore).toBe(1); // USA wins because 5 < 6
      expect(result2.europeMatchPlayAdjustedScore).toBe(0);
    });
  });

  describe('EUROPE with higher handicap', () => {
    it('should correctly apply single handicap stroke for EUROPE on a low index hole', () => {
      const game = createMockGame(1, 'EUROPE');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 4, europeScore: 5 }
      );

      expect(result.usaAdjustedScore).toBe(5); // USA gets 1 stroke added
      expect(result.europeAdjustedScore).toBe(5);
      expect(result.usaMatchPlayScore).toBe(1);
      expect(result.europeMatchPlayScore).toBe(0);
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should correctly apply handicap strokes for EUROPE with high stroke difference', () => {
      const game = createMockGame(36, 'EUROPE');
      
      // Testing on hole with stroke index 5 (should receive 3 strokes due to 36/18=2 + extra)
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 5 },
        { usaScore: 3, europeScore: 6 }
      );

      expect(result.usaAdjustedScore).toBe(5); // USA gets 2 strokes added (36/18=2)
      expect(result.europeAdjustedScore).toBe(6);
      expect(result.usaMatchPlayScore).toBe(1);
      expect(result.europeMatchPlayScore).toBe(0);
      expect(result.usaMatchPlayAdjustedScore).toBe(1); // USA wins after adjustment
      expect(result.europeMatchPlayAdjustedScore).toBe(0);
    });

    it('should handle handicap of 40 (2 strokes per hole + 4 extra strokes on first 4 holes) for EUROPE', () => {
      const game = createMockGame(40, 'EUROPE');
      
      // Test first 4 holes (should get 3 strokes each)
      for (let i = 1; i <= 4; i++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex: i },
          { usaScore: 4, europeScore: 5 }
        );
        
        // Each of first 4 holes gets 3 strokes (2 base + 1 extra)
        expect(result.usaAdjustedScore).toBe(7); // USA gets 3 strokes added
        expect(result.europeAdjustedScore).toBe(5);
        // In match play, lower score wins - EUROPE wins because 5 < 7
        expect(result.usaMatchPlayAdjustedScore).toBe(0);
        expect(result.europeMatchPlayAdjustedScore).toBe(1);
      }
      
      // Test remaining holes (should get 2 strokes each)
      for (let i = 5; i <= 18; i++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex: i },
          { usaScore: 4, europeScore: 5 }
        );
        
        // Remaining holes get 2 strokes each (base only)
        expect(result.usaAdjustedScore).toBe(6); // USA gets 2 strokes added
        expect(result.europeAdjustedScore).toBe(5);
        // In match play, lower score wins - EUROPE wins because 5 < 6
        expect(result.usaMatchPlayAdjustedScore).toBe(0);
        expect(result.europeMatchPlayAdjustedScore).toBe(1);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely high handicaps correctly', () => {
      const game = createMockGame(54, 'USA'); // 3 strokes per hole
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 7, europeScore: 3 }
      );

      expect(result.europeAdjustedScore).toBe(6); // Europe gets 3 strokes (54/18=3)
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(1); // Europe wins after adjustment
    });

    it('should handle tie scores correctly with handicaps', () => {
      const game = createMockGame(5, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 3 },
        { usaScore: 4, europeScore: 4 }
      );

      expect(result.usaAdjustedScore).toBe(4);
      expect(result.europeAdjustedScore).toBe(5); // Europe gets 1 stroke
      expect(result.usaMatchPlayScore).toBe(0);
      expect(result.europeMatchPlayScore).toBe(0); // Tied without adjustment
      expect(result.usaMatchPlayAdjustedScore).toBe(1); // USA wins after adjustment
      expect(result.europeMatchPlayAdjustedScore).toBe(0);
    });

    it('should handle handicap of 36 (exactly 2 strokes per hole)', () => {
      const game = createMockGame(36, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 3 }
      );

      expect(result.europeAdjustedScore).toBe(5); // Europe gets 2 strokes (36/18=2)
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should handle handicap of 37 (2 strokes for all holes + 1 extra for stroke index 1)', () => {
      const game = createMockGame(37, 'USA');
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 3 }
      );
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 2 },
        { usaScore: 5, europeScore: 3 }
      );

      // First hole gets 3 strokes (2 base + 1 extra)
      expect(result1.europeAdjustedScore).toBe(6);
      // Second hole gets 2 strokes (2 base only)
      expect(result2.europeAdjustedScore).toBe(5);
    });

    it('should handle handicap of 72 (exactly 4 strokes per hole)', () => {
      const game = createMockGame(72, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 1 }
      );

      expect(result.europeAdjustedScore).toBe(5); // Europe gets 4 strokes (72/18=4)
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should handle handicap of 73 (4 strokes per hole + 1 extra on first hole)', () => {
      const game = createMockGame(73, 'USA');
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 1 }
      );
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 2 },
        { usaScore: 5, europeScore: 1 }
      );

      // First hole gets 5 strokes (4 base + 1 extra)
      expect(result1.europeAdjustedScore).toBe(6);
      // Second hole gets 4 strokes (4 base only)
      expect(result2.europeAdjustedScore).toBe(5);
    });

    it('should handle handicap of 90 (exactly 5 strokes per hole)', () => {
      const game = createMockGame(90, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 0 }
      );

      expect(result.europeAdjustedScore).toBe(5); // Europe gets 5 strokes (90/18=5)
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should handle handicap of 91 (5 strokes per hole + 1 extra on first hole)', () => {
      const game = createMockGame(91, 'USA');
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: 0 }
      );
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 2 },
        { usaScore: 5, europeScore: 0 }
      );

      // First hole gets 6 strokes (5 base + 1 extra)
      expect(result1.europeAdjustedScore).toBe(6);
      // Second hole gets 5 strokes (5 base only)
      expect(result2.europeAdjustedScore).toBe(5);
    });

    it('should handle handicap of 108 (exactly 6 strokes per hole)', () => {
      const game = createMockGame(108, 'USA');
      const result = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: -1 }
      );

      expect(result.europeAdjustedScore).toBe(5); // Europe gets 6 strokes (108/18=6)
      expect(result.usaMatchPlayAdjustedScore).toBe(0);
      expect(result.europeMatchPlayAdjustedScore).toBe(0); // Tied after adjustment
    });

    it('should handle handicap of 109 (6 strokes per hole + 1 extra on first hole)', () => {
      const game = createMockGame(109, 'USA');
      const result1 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 1 },
        { usaScore: 5, europeScore: -1 }
      );
      const result2 = calculateHandicapAdjustedScores(
        game,
        { strokeIndex: 2 },
        { usaScore: 5, europeScore: -1 }
      );

      // First hole gets 7 strokes (6 base + 1 extra)
      expect(result1.europeAdjustedScore).toBe(6);
      // Second hole gets 6 strokes (6 base only)
      expect(result2.europeAdjustedScore).toBe(5);
    });

    it('should handle handicap of 40 (2 strokes per hole + 4 extra strokes on first 4 holes)', () => {
      const game = createMockGame(40, 'USA');
      
      // Test first 4 holes (should get 3 strokes each)
      for (let i = 1; i <= 4; i++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex: i },
          { usaScore: 5, europeScore: 4 }
        );
        
        // Each of first 4 holes gets 3 strokes (2 base + 1 extra)
        expect(result.europeAdjustedScore).toBe(7);
        expect(result.usaMatchPlayAdjustedScore).toBe(1); // USA wins because 5 < 7
        expect(result.europeMatchPlayAdjustedScore).toBe(0);
      }
      
      // Test remaining holes (should get 2 strokes each)
      for (let i = 5; i <= 18; i++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex: i },
          { usaScore: 5, europeScore: 4 }
        );
        
        // Remaining holes get 2 strokes each (base only)
        expect(result.europeAdjustedScore).toBe(6);
        expect(result.usaMatchPlayAdjustedScore).toBe(1); // USA wins because 5 < 6
        expect(result.europeMatchPlayAdjustedScore).toBe(0);
      }
    });

    it('should allocate correct total strokes across various handicap values', () => {
      // Test multiple handicap values to ensure correct total stroke allocation
      const handicapValues = [1, 5, 14, 18, 19, 23, 36, 37, 40, 54];
      
      for (const handicapStrokes of handicapValues) {
        const game = createMockGame(handicapStrokes, 'USA');
        const baseScore = 4;
        let totalStrokesAllocated = 0;
        
        // Check all 18 holes for this handicap value
        for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
          const result = calculateHandicapAdjustedScores(
            game,
            { strokeIndex },
            { usaScore: baseScore, europeScore: baseScore }
          );
          
          // Count strokes added to EUROPE score
          if (result.europeAdjustedScore !== baseScore) {
            totalStrokesAllocated += (result.europeAdjustedScore! - baseScore);
          }
        }
        
        // Verify total strokes match the handicap value
        expect(totalStrokesAllocated).toBe(handicapStrokes);
      }
    });

    it('should not apply any strokes when players have equal handicaps', () => {
      // Create a mock game where players have same handicap but USA is labeled as higherHandicapTeam
      // This should result in handicapStrokes = 0
      const game = {
        ...createMockGame(0, 'USA'),
        usaPlayerHandicap: 10,
        europePlayerHandicap: 10
      };
      const baseScore = 4;
      
      // Test various stroke indexes
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Scores should remain unchanged
        expect(result.usaAdjustedScore).toBe(baseScore);
        expect(result.europeAdjustedScore).toBe(baseScore);
        
        // Match play scores should be tied
        expect(result.usaMatchPlayAdjustedScore).toBe(0);
        expect(result.europeMatchPlayAdjustedScore).toBe(0);
      }
    });

    it('should not apply strokes when one player has no handicap specified', () => {
      // Create mock games where one player's handicap is undefined
      const gameUSANoHandicap = {
        ...createMockGame(0, 'EUROPE'),
        usaPlayerHandicap: undefined,
        europePlayerHandicap: 15
      };
      
      const gameEuropeNoHandicap = {
        ...createMockGame(0, 'USA'),
        usaPlayerHandicap: 15,
        europePlayerHandicap: undefined
      };
      
      const baseScore = 4;
      
      // Test with USA having no handicap
      for (let strokeIndex = 1; strokeIndex <= 5; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          gameUSANoHandicap,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Scores should remain unchanged
        expect(result.usaAdjustedScore).toBe(baseScore);
        expect(result.europeAdjustedScore).toBe(baseScore);
      }
      
      // Test with EUROPE having no handicap
      for (let strokeIndex = 1; strokeIndex <= 5; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          gameEuropeNoHandicap,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Scores should remain unchanged
        expect(result.usaAdjustedScore).toBe(baseScore);
        expect(result.europeAdjustedScore).toBe(baseScore);
      }
    });
  });

  describe('Handicap stroke allocation by stroke index', () => {
    it('should correctly allocate 14 strokes to holes with stroke indexes 1-14', () => {
      const game = createMockGame(14, 'EUROPE');
      const baseScore = 4;
      
      // Test all 18 holes to ensure correct stroke allocation
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Holes with stroke index 1-14 should get 1 stroke
        if (strokeIndex <= 14) {
          expect(result.usaAdjustedScore).toBe(baseScore + 1);
        } 
        // Holes with stroke index 15-18 should not get any strokes
        else {
          expect(result.usaAdjustedScore).toBe(baseScore);
        }
      }
    });

    it('should correctly allocate 23 strokes to holes with stroke indexes 1-18 and 1-5 again', () => {
      const game = createMockGame(23, 'USA');
      const baseScore = 4;
      
      // Test all 18 holes to ensure correct stroke allocation
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // All holes get at least 1 stroke (18 strokes)
        // First 5 holes get an additional stroke (5 more strokes)
        const expectedStrokes = 1 + (strokeIndex <= 5 ? 1 : 0);
        expect(result.europeAdjustedScore).toBe(baseScore + expectedStrokes);
      }
    });

    it('should correctly allocate exactly 18 strokes (1 per hole) for handicap of 18', () => {
      const game = createMockGame(18, 'USA');
      const baseScore = 4;
      
      // Test all 18 holes to ensure correct stroke allocation
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // All holes get exactly 1 stroke
        expect(result.europeAdjustedScore).toBe(baseScore + 1);
      }
    });

    it('should correctly handle the specific case of 11 strokes (the issue reported by user)', () => {
      // Create a game with a 14 stroke difference (like in the reported issue)
      const game = createMockGame(14, 'EUROPE');
      const baseScore = 4;
      
      // Count how many strokes are actually allocated
      let totalStrokesAllocated = 0;
      
      // Test all 18 holes
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Count allocated strokes
        if (result.usaAdjustedScore !== baseScore) {
          totalStrokesAllocated += (result.usaAdjustedScore! - baseScore);
        }
      }
      
      // Ensure exactly 14 strokes were allocated, not 11 as in the reported issue
      expect(totalStrokesAllocated).toBe(14);
    });

    it('should handle handicap of 37 (2 strokes for all holes + 1 extra for stroke index 1)', () => {
      const game = createMockGame(37, 'EUROPE');
      const baseScore = 3;
      
      // For every hole
      for (let strokeIndex = 1; strokeIndex <= 18; strokeIndex++) {
        const result = calculateHandicapAdjustedScores(
          game,
          { strokeIndex },
          { usaScore: baseScore, europeScore: baseScore }
        );
        
        // Base strokes (37/18 = 2 for all holes)
        // Extra stroke (37%18 = 1) for hole with stroke index 1
        const expectedStrokes = 2 + (strokeIndex === 1 ? 1 : 0);
        
        expect(result.usaAdjustedScore).toBe(baseScore + expectedStrokes);
      }
    });
  });
});

describe('calculateAverageTeamHandicaps', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'USA Player 1', team: 'USA', averageScore: 10, historicalScores: [] },
    { id: '2', name: 'USA Player 2', team: 'USA', averageScore: 12.5, historicalScores: [] },
    { id: '3', name: 'Europe Player 1', team: 'EUROPE', averageScore: 8, historicalScores: [] },
    { id: '4', name: 'Europe Player 2', team: 'EUROPE', averageScore: 14.2, historicalScores: [] },
    { id: '5', name: 'USA Player 3', team: 'USA', averageScore: 9.8, historicalScores: [] },
  ];

  it('should calculate average handicaps correctly for both teams', () => {
    const result = calculateAverageTeamHandicaps(mockPlayers);
    // USA: (10 + 12.5 + 9.8) / 3 = 32.3 / 3 = 10.766... -> 10.8
    // Europe: (8 + 14.2) / 2 = 22.2 / 2 = 11.1
    expect(result.usaAverage).toBe(10.8);
    expect(result.europeAverage).toBe(11.1);
  });

  it('should return 0 if no players for a team', () => {
    const noUsaPlayers: Player[] = mockPlayers.filter(p => p.team === 'EUROPE');
    const result = calculateAverageTeamHandicaps(noUsaPlayers);
    expect(result.usaAverage).toBe(0);
    expect(result.europeAverage).toBe(11.1); // (8 + 14.2) / 2

    const noEuropePlayers: Player[] = mockPlayers.filter(p => p.team === 'USA');
    const result2 = calculateAverageTeamHandicaps(noEuropePlayers);
    expect(result2.usaAverage).toBe(10.8); // (10 + 12.5 + 9.8) / 3
    expect(result2.europeAverage).toBe(0);
  });

  it('should return 0 for both if no players are provided', () => {
    const result = calculateAverageTeamHandicaps([]);
    expect(result.usaAverage).toBe(0);
    expect(result.europeAverage).toBe(0);
  });

  it('should handle players with missing or invalid averageScore by excluding them', () => {
    const playersWithInvalid: Player[] = [
      ...mockPlayers,
      { id: '6', name: 'USA Player Invalid', team: 'USA', averageScore: NaN, historicalScores: [] } as Player,
      { id: '7', name: 'Europe Player Missing', team: 'EUROPE', averageScore: undefined as any, historicalScores: [] } as Player,
    ];
    const result = calculateAverageTeamHandicaps(playersWithInvalid);
    expect(result.usaAverage).toBe(10.8); // Should be same as original mockPlayers
    expect(result.europeAverage).toBe(11.1); // Should be same as original mockPlayers
  });
  
  it('should handle single player per team', () => {
    const singlePlayers: Player[] = [
      { id: '1', name: 'USA Player 1', team: 'USA', averageScore: 10, historicalScores: [] },
      { id: '3', name: 'Europe Player 1', team: 'EUROPE', averageScore: 8.5, historicalScores: [] },
    ];
    const result = calculateAverageTeamHandicaps(singlePlayers);
    expect(result.usaAverage).toBe(10.0);
    expect(result.europeAverage).toBe(8.5);
  });

  it('should correctly round to one decimal place', () => {
    const playersForRounding: Player[] = [
      { id: '1', name: 'USA Player A', team: 'USA', averageScore: 10.12, historicalScores: [] },
      { id: '2', name: 'USA Player B', team: 'USA', averageScore: 10.17, historicalScores: [] },
      { id: '3', name: 'Europe Player C', team: 'EUROPE', averageScore: 8.88, historicalScores: [] },
    ];
    // USA: (10.12 + 10.17) / 2 = 20.29 / 2 = 10.145 -> 10.1
    // Europe: 8.88 -> 8.9
    const result = calculateAverageTeamHandicaps(playersForRounding);
    expect(result.usaAverage).toBe(10.1); 
    expect(result.europeAverage).toBe(8.9);
  });
}); 