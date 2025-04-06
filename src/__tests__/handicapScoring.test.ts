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
  });
}); 