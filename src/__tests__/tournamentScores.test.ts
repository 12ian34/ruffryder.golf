import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { updateTournamentScores } from '../utils/tournamentScores';
import type { Game } from '../types/game';
import type { Tournament } from '../types/tournament';

// Mock Firebase config to prevent auth initialization
vi.mock('../config/firebase', () => ({
  app: {},
  auth: {},
  db: {},
}));

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
  collection: vi.fn(() => ({
    type: 'firestore',
    app: {},
    toJSON: () => ({}),
    id: 'mock-db',
    path: '',
    parent: null,
    converter: null,
    firestore: null,
  })),
  getDocs: vi.fn(),
  arrayUnion: vi.fn((...elements) => elements),
}));

describe('Tournament Scores Tests', () => {
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

  const mockTournament: Tournament = {
    id: 'tournament1',
    name: 'Test Tournament',
    year: 2024,
    isActive: true,
    useHandicaps: false,
    teamConfig: 'USA_VS_EUROPE',
    handicapStrokes: 0,
    higherHandicapTeam: 'USA',
    totalScore: { raw: { USA: 0, EUROPE: 0 }, adjusted: { USA: 0, EUROPE: 0 } },
    projectedScore: { raw: { USA: 0, EUROPE: 0 }, adjusted: { USA: 0, EUROPE: 0 } },
    progress: [],
    matchups: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Score Updates', () => {
    it('should correctly update tournament scores', async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: [{
          id: 'game1',
          data: () => mockGame
        }]
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: []
        })
      });

      (updateDoc as any).mockResolvedValueOnce(undefined);

      await updateTournamentScores(mockTournament.id);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalScore: expect.any(Object),
          projectedScore: expect.any(Object)
        })
      );
    });

    it('should handle multiple games in tournament', async () => {
      const mockGame2: Game = {
        ...mockGame,
        id: 'game2',
        strokePlayScore: {
          USA: 75,
          EUROPE: 72,
          adjustedUSA: 75,
          adjustedEUROPE: 72,
        },
        matchPlayScore: {
          USA: 1,
          EUROPE: 2,
          adjustedUSA: 1,
          adjustedEUROPE: 2,
        },
      };

      (getDocs as any).mockResolvedValueOnce({
        docs: [
          { id: 'game1', data: () => mockGame },
          { id: 'game2', data: () => mockGame2 }
        ]
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: []
        })
      });

      (updateDoc as any).mockResolvedValueOnce(undefined);

      await updateTournamentScores(mockTournament.id);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalScore: expect.objectContaining({
            raw: expect.objectContaining({
              USA: expect.any(Number),
              EUROPE: expect.any(Number)
            })
          })
        })
      );
    });

    it('should handle games with handicaps', async () => {
      const gameWithHandicaps: Game = {
        ...mockGame,
        handicapStrokes: 5,
        higherHandicapTeam: 'EUROPE',
        strokePlayScore: {
          USA: 72,
          EUROPE: 75,
          adjustedUSA: 72,
          adjustedEUROPE: 70,
        },
        matchPlayScore: {
          USA: 2,
          EUROPE: 1,
          adjustedUSA: 2,
          adjustedEUROPE: 1,
        },
      };

      (getDocs as any).mockResolvedValueOnce({
        docs: [{
          id: 'game1',
          data: () => gameWithHandicaps
        }]
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: [],
          useHandicaps: true
        })
      });

      (updateDoc as any).mockResolvedValueOnce(undefined);

      await updateTournamentScores(mockTournament.id);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalScore: expect.objectContaining({
            adjusted: expect.objectContaining({
              USA: expect.any(Number),
              EUROPE: expect.any(Number)
            })
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when fetching games', async () => {
      (getDocs as any).mockRejectedValueOnce(new Error('Fetch failed'));

      try {
        await updateTournamentScores(mockTournament.id);
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Fetch failed');
      }
    });

    it('should handle errors when updating tournament', async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: [{
          id: 'game1',
          data: () => mockGame
        }]
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: []
        })
      });

      (updateDoc as any).mockRejectedValueOnce(new Error('Update failed'));

      try {
        await updateTournamentScores(mockTournament.id);
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Update failed');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tournament', async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: []
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: []
        })
      });

      (updateDoc as any).mockResolvedValueOnce(undefined);

      await updateTournamentScores(mockTournament.id);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalScore: expect.objectContaining({
            raw: expect.objectContaining({
              USA: 0,
              EUROPE: 0
            })
          })
        })
      );
    });

    it('should handle incomplete games', async () => {
      const incompleteGame: Game = {
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

      (getDocs as any).mockResolvedValueOnce({
        docs: [{
          id: 'game1',
          data: () => incompleteGame
        }]
      });

      (getDoc as any).mockResolvedValueOnce({
        data: () => ({
          progress: []
        })
      });

      (updateDoc as any).mockResolvedValueOnce(undefined);

      await updateTournamentScores(mockTournament.id);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalScore: expect.objectContaining({
            raw: expect.objectContaining({
              USA: expect.any(Number),
              EUROPE: expect.any(Number)
            })
          })
        })
      );
    });
  });
}); 