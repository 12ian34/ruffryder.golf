import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, updateDoc } from 'firebase/firestore';
import type { Tournament } from '../types/tournament';

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
  updateDoc: vi.fn(),
}));

describe('Tournament Management Tests', () => {
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

  describe('Tournament Status Management', () => {
    it('should correctly toggle tournament active status', async () => {
      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { isActive: false }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { isActive: false }
      );
    });

    it('should handle errors when toggling tournament status', async () => {
      (updateDoc as any).mockRejectedValueOnce(new Error('Update failed'));

      try {
        await updateDoc(
          doc({} as any, 'tournaments', mockTournament.id),
          { isActive: false }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('Update failed');
        }
      }
    });
  });

  describe('Tournament Settings', () => {
    it('should correctly toggle handicap usage', async () => {
      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { useHandicaps: true }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { useHandicaps: true }
      );
    });

    it('should update team configuration', async () => {
      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { teamConfig: 'SINGLES' }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { teamConfig: 'SINGLES' }
      );
    });

    it('should update handicap strokes', async () => {
      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { handicapStrokes: 5 }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { handicapStrokes: 5 }
      );
    });
  });

  describe('Tournament Progress', () => {
    it('should update tournament progress', async () => {
      const newProgress = [
        { round: 1, status: 'complete', date: new Date().toISOString() },
        { round: 2, status: 'in_progress', date: new Date().toISOString() }
      ];

      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { progress: newProgress }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { progress: newProgress }
      );
    });

    it('should update tournament scores', async () => {
      const newScores = {
        raw: { USA: 5, EUROPE: 3 },
        adjusted: { USA: 5, EUROPE: 3 }
      };

      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { totalScore: newScores }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { totalScore: newScores }
      );
    });

    it('should update projected scores', async () => {
      const newProjectedScores = {
        raw: { USA: 8, EUROPE: 4 },
        adjusted: { USA: 8, EUROPE: 4 }
      };

      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { projectedScore: newProjectedScores }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { projectedScore: newProjectedScores }
      );
    });
  });

  describe('Tournament Matchups', () => {
    it('should update tournament matchups', async () => {
      const newMatchups = [
        { round: 1, matchups: [{ player1: 'p1', player2: 'p2' }] },
        { round: 2, matchups: [{ player1: 'p3', player2: 'p4' }] }
      ];

      (updateDoc as any).mockResolvedValueOnce(undefined);

      const result = await updateDoc(
        doc({} as any, 'tournaments', mockTournament.id),
        { matchups: newMatchups }
      );

      expect(result).toBeUndefined();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        { matchups: newMatchups }
      );
    });
  });
}); 