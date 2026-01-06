import { describe, it, expect } from 'vitest';
import { calculateGamePoints } from '../utils/gamePoints';
import type { Game } from '../types/game';

// Helper to create a minimal game with specific scores
function createGameWithScores(
  strokePlay: { usa: number; europe: number; adjustedUSA?: number; adjustedEUROPE?: number },
  matchPlay: { usa: number; europe: number; adjustedUSA?: number; adjustedEUROPE?: number },
  options: { isStarted?: boolean } = {}
): Game {
  return {
    id: 'game1',
    tournamentId: 'tournament1',
    usaPlayerId: 'usa1',
    usaPlayerName: 'USA Player',
    europePlayerId: 'europe1',
    europePlayerName: 'Europe Player',
    handicapStrokes: 0,
    higherHandicapTeam: 'USA',
    holes: [],
    strokePlayScore: {
      USA: strokePlay.usa,
      EUROPE: strokePlay.europe,
      adjustedUSA: strokePlay.adjustedUSA ?? strokePlay.usa,
      adjustedEUROPE: strokePlay.adjustedEUROPE ?? strokePlay.europe,
    },
    matchPlayScore: {
      USA: matchPlay.usa,
      EUROPE: matchPlay.europe,
      adjustedUSA: matchPlay.adjustedUSA ?? matchPlay.usa,
      adjustedEUROPE: matchPlay.adjustedEUROPE ?? matchPlay.europe,
    },
    points: { raw: { USA: 0, EUROPE: 0 }, adjusted: { USA: 0, EUROPE: 0 } },
    isComplete: true,
    isStarted: options.isStarted ?? true,
    playerIds: ['usa1', 'europe1'],
    status: 'complete',
  };
}

describe('gamePoints - calculateGamePoints', () => {
  describe('Game not started', () => {
    it('returns 0-0 when game has not started', () => {
      const game = createGameWithScores(
        { usa: 72, europe: 75 },
        { usa: 10, europe: 8 },
        { isStarted: false }
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(0);
      expect(result.raw.EUROPE).toBe(0);
      expect(result.adjusted.USA).toBe(0);
      expect(result.adjusted.EUROPE).toBe(0);
    });
  });

  describe('All 9 Points Table Combinations (Raw Scores)', () => {
    /**
     * Points Table Reference:
     * | Stroke Play | Match Play | USA Points | EUROPE Points |
     * |-------------|------------|------------|---------------|
     * | USA wins    | USA wins   | 2          | 0             |
     * | EUROPE wins | EUROPE wins| 0          | 2             |
     * | USA wins    | EUROPE wins| 1          | 1             |
     * | EUROPE wins | USA wins   | 1          | 1             |
     * | Tie         | USA wins   | 0.5        | 1.5           |
     * | Tie         | EUROPE wins| 1.5        | 0.5           |
     * | USA wins    | Tie        | 1.5        | 0.5           |
     * | EUROPE wins | Tie        | 0.5        | 1.5           |
     * | Tie         | Tie        | 1          | 1             |
     */

    it('USA wins both: USA gets 2, EUROPE gets 0', () => {
      const game = createGameWithScores(
        { usa: 70, europe: 75 }, // USA wins stroke play (lower is better)
        { usa: 10, europe: 8 }  // USA wins match play (higher is better)
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(2);
      expect(result.raw.EUROPE).toBe(0);
    });

    it('EUROPE wins both: USA gets 0, EUROPE gets 2', () => {
      const game = createGameWithScores(
        { usa: 78, europe: 72 }, // EUROPE wins stroke play
        { usa: 6, europe: 12 }   // EUROPE wins match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(0);
      expect(result.raw.EUROPE).toBe(2);
    });

    it('USA wins stroke play, EUROPE wins match play: 1-1 split', () => {
      const game = createGameWithScores(
        { usa: 70, europe: 75 }, // USA wins stroke play
        { usa: 6, europe: 12 }   // EUROPE wins match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(1);
      expect(result.raw.EUROPE).toBe(1);
    });

    it('EUROPE wins stroke play, USA wins match play: 1-1 split', () => {
      const game = createGameWithScores(
        { usa: 78, europe: 72 }, // EUROPE wins stroke play
        { usa: 10, europe: 8 }   // USA wins match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(1);
      expect(result.raw.EUROPE).toBe(1);
    });

    it('Stroke play tied, USA wins match play: USA gets 1.5, EUROPE gets 0.5', () => {
      const game = createGameWithScores(
        { usa: 72, europe: 72 }, // Tied stroke play
        { usa: 10, europe: 8 }   // USA wins match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(1.5);
      expect(result.raw.EUROPE).toBe(0.5);
    });

    it('Stroke play tied, EUROPE wins match play: USA gets 0.5, EUROPE gets 1.5', () => {
      const game = createGameWithScores(
        { usa: 72, europe: 72 }, // Tied stroke play
        { usa: 6, europe: 12 }   // EUROPE wins match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(0.5);
      expect(result.raw.EUROPE).toBe(1.5);
    });

    it('USA wins stroke play, match play tied: USA gets 1.5, EUROPE gets 0.5', () => {
      const game = createGameWithScores(
        { usa: 70, europe: 75 }, // USA wins stroke play
        { usa: 9, europe: 9 }    // Tied match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(1.5);
      expect(result.raw.EUROPE).toBe(0.5);
    });

    it('EUROPE wins stroke play, match play tied: USA gets 0.5, EUROPE gets 1.5', () => {
      const game = createGameWithScores(
        { usa: 78, europe: 72 }, // EUROPE wins stroke play
        { usa: 9, europe: 9 }    // Tied match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(0.5);
      expect(result.raw.EUROPE).toBe(1.5);
    });

    it('Both tied: 1-1 split', () => {
      const game = createGameWithScores(
        { usa: 72, europe: 72 }, // Tied stroke play
        { usa: 9, europe: 9 }    // Tied match play
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(1);
      expect(result.raw.EUROPE).toBe(1);
    });
  });

  describe('Adjusted scores differ from raw scores', () => {
    it('handles when handicap changes outcomes', () => {
      const game = createGameWithScores(
        { usa: 80, europe: 72, adjustedUSA: 70, adjustedEUROPE: 72 },
        { usa: 6, europe: 12, adjustedUSA: 10, adjustedEUROPE: 8 }
      );
      
      const result = calculateGamePoints(game);
      
      // Raw: EUROPE wins both (0-2)
      expect(result.raw.USA).toBe(0);
      expect(result.raw.EUROPE).toBe(2);
      
      // Adjusted: USA wins both (2-0)
      expect(result.adjusted.USA).toBe(2);
      expect(result.adjusted.EUROPE).toBe(0);
    });

    it('handles partial handicap reversal (only match play reversed)', () => {
      const game = createGameWithScores(
        { usa: 80, europe: 72, adjustedUSA: 78, adjustedEUROPE: 72 },
        { usa: 6, europe: 12, adjustedUSA: 10, adjustedEUROPE: 8 }
      );
      
      const result = calculateGamePoints(game);
      
      // Raw: EUROPE wins both (0-2)
      expect(result.raw.USA).toBe(0);
      expect(result.raw.EUROPE).toBe(2);
      
      // Adjusted: EUROPE wins stroke, USA wins match (1-1)
      expect(result.adjusted.USA).toBe(1);
      expect(result.adjusted.EUROPE).toBe(1);
    });

    it('handles handicap creating ties from wins', () => {
      const game = createGameWithScores(
        { usa: 70, europe: 75, adjustedUSA: 72, adjustedEUROPE: 72 },
        { usa: 10, europe: 8, adjustedUSA: 9, adjustedEUROPE: 9 }
      );
      
      const result = calculateGamePoints(game);
      
      // Raw: USA wins both (2-0)
      expect(result.raw.USA).toBe(2);
      expect(result.raw.EUROPE).toBe(0);
      
      // Adjusted: Both tied (1-1)
      expect(result.adjusted.USA).toBe(1);
      expect(result.adjusted.EUROPE).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('handles zero scores (both 0-0)', () => {
      const game = createGameWithScores(
        { usa: 0, europe: 0 },
        { usa: 0, europe: 0 }
      );
      
      const result = calculateGamePoints(game);
      
      // Zero-zero is treated as a tie
      expect(result.raw.USA).toBe(1);
      expect(result.raw.EUROPE).toBe(1);
    });

    it('handles very large score differences', () => {
      const game = createGameWithScores(
        { usa: 54, europe: 120 },
        { usa: 18, europe: 0 }
      );
      
      const result = calculateGamePoints(game);
      
      expect(result.raw.USA).toBe(2);
      expect(result.raw.EUROPE).toBe(0);
    });

    it('handles decimal match play scores', () => {
      const game = createGameWithScores(
        { usa: 72, europe: 72 },
        { usa: 9.5, europe: 8.5 }
      );
      
      const result = calculateGamePoints(game);
      
      // Stroke play tied, USA wins match play
      expect(result.raw.USA).toBe(1.5);
      expect(result.raw.EUROPE).toBe(0.5);
    });

    it('points always sum to 2', () => {
      const testCases = [
        { stroke: { usa: 70, europe: 75 }, match: { usa: 10, europe: 8 } },
        { stroke: { usa: 75, europe: 70 }, match: { usa: 8, europe: 10 } },
        { stroke: { usa: 72, europe: 72 }, match: { usa: 9, europe: 9 } },
        { stroke: { usa: 70, europe: 75 }, match: { usa: 8, europe: 10 } },
        { stroke: { usa: 72, europe: 72 }, match: { usa: 10, europe: 8 } },
      ];
      
      for (const { stroke, match } of testCases) {
        const game = createGameWithScores(stroke, match);
        const result = calculateGamePoints(game);
        
        expect(result.raw.USA + result.raw.EUROPE).toBe(2);
        expect(result.adjusted.USA + result.adjusted.EUROPE).toBe(2);
      }
    });
  });
});

