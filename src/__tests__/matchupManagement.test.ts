import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('Matchup Management Tests', () => {
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

  describe('Matchup Creation', () => {
    it('should create a new matchup', async () => {
      (addDoc as any).mockResolvedValueOnce({
        id: 'new-matchup',
      });

      const result = await addDoc(
        collection({} as any, 'tournaments', 'tournament1', 'games'),
        mockGame
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('new-matchup');
      expect(addDoc).toHaveBeenCalledWith(
        expect.any(Object),
        mockGame
      );
    });

    it('should create a matchup with equal handicaps', async () => {
      const gameWithEqualHandicaps: Game = {
        ...mockGame,
        handicapStrokes: 0,
        higherHandicapTeam: 'USA',
      };

      (addDoc as any).mockResolvedValueOnce({
        id: 'new-matchup',
      });

      const result = await addDoc(
        collection({} as any, 'tournaments', 'tournament1', 'games'),
        gameWithEqualHandicaps
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('new-matchup');
      expect(addDoc).toHaveBeenCalledWith(
        expect.any(Object),
        gameWithEqualHandicaps
      );
    });
  });

  describe('Matchup Status Management', () => {
    it('should update matchup status', async () => {
      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', 'tournament1', 'games', 'game1'),
        { status: 'in_progress' }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { status: 'in_progress' }
      );
    });

    it('should handle errors when updating status', async () => {
      (updateDoc as any).mockRejectedValueOnce(new Error('Update failed'));

      try {
        await updateDoc(
          doc({} as any, 'tournaments', 'tournament1', 'games', 'game1'),
          { status: 'in_progress' }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('Update failed');
        }
      }
    });
  });

  describe('Matchup Deletion', () => {
    it('should delete a matchup', async () => {
      (deleteDoc as any).mockResolvedValueOnce(undefined);

      const result = await deleteDoc(
        doc({} as any, 'tournaments', 'tournament1', 'games', 'game1')
      );

      expect(result).toBeUndefined();
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle errors when deleting matchup', async () => {
      (deleteDoc as any).mockRejectedValueOnce(new Error('Delete failed'));

      try {
        await deleteDoc(
          doc({} as any, 'tournaments', 'tournament1', 'games', 'game1')
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('Delete failed');
        }
      }
    });
  });

  describe('Matchup Score Updates', () => {
    it('should update matchup scores', async () => {
      const updatedScores = {
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

      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', 'tournament1', 'games', 'game1'),
        updatedScores
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        updatedScores
      );
    });

    it('should handle errors when updating scores', async () => {
      (updateDoc as any).mockRejectedValueOnce(new Error('Update failed'));

      try {
        await updateDoc(
          doc({} as any, 'tournaments', 'tournament1', 'games', 'game1'),
          { strokePlayScore: { USA: 72, EUROPE: 75 } }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('Update failed');
        }
      }
    });
  });
}); 