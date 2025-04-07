import { describe, it, expect } from 'vitest';
import { calculateHandicapAdjustedScores } from '../utils/handicapScoring';
import type { Game } from '../types/game';

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

    it('should handle handicap of 37 (2 strokes per hole + 1 extra on first hole)', () => {
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
  });
}); 