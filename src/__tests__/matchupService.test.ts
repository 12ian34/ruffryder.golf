import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Matchup } from '../types/tournament';

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  db: {},
}));

// Mock crypto.randomUUID
const mockUUID = 'mock-fourball-uuid-12345';
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
});

// Create mock functions
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn(() => ({ id: 'mock-ref' }));

vi.mock('firebase/firestore', () => ({
  doc: () => mockDoc(),
  getDoc: () => mockGetDoc(),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
}));

// Helper to create a tournament snapshot mock
const createTournamentSnap = (exists: boolean, matchups?: Matchup[]) => ({
  exists: () => exists,
  data: () => exists ? (matchups ? { matchups } : undefined) : undefined,
});

// Helper to create a game snapshot mock
const createGameSnap = (exists: boolean, data?: Record<string, unknown>) => ({
  exists: () => exists,
  data: () => data,
});

describe('matchupService', () => {
  const tournamentId = 'tournament-123';
  
  const createMatchup = (id: string, usaPlayerId: string, europePlayerId: string, fourballId?: string): Matchup => ({
    id,
    usaPlayerId,
    usaPlayerName: `USA ${usaPlayerId}`,
    europePlayerId,
    europePlayerName: `EUROPE ${europePlayerId}`,
    status: 'pending',
    fourballId,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe('pairMatchups', () => {
    it('should throw an error if trying to pair a matchup with itself', async () => {
      const { pairMatchups } = await import('../services/matchupService');
      
      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-1'))
        .rejects.toThrow('Cannot pair a matchup with itself.');
    });

    it('should throw an error if tournament not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(false));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow(`Tournament with ID ${tournamentId} not found.`);
    });

    it('should throw an error if tournament data is missing matchups', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    });

    it('should throw an error if matchup1 is not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true, [
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ]));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow(`Matchup with ID matchup-1 not found in tournament ${tournamentId}.`);
    });

    it('should throw an error if matchup2 is not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true, [
        createMatchup('matchup-1', 'player-1', 'player-2'),
      ]));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow(`Matchup with ID matchup-2 not found in tournament ${tournamentId}.`);
    });

    it('should throw an error if matchup1 is already in a different fourball', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true, [
        createMatchup('matchup-1', 'player-1', 'player-2', 'existing-fourball-1'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ]));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow('One or both matchups are already part of a different fourball.');
    });

    it('should throw an error if matchup2 is already in a different fourball', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true, [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4', 'existing-fourball-2'),
      ]));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow('One or both matchups are already part of a different fourball.');
    });

    it('should throw an error if both matchups are in different fourballs', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true, [
        createMatchup('matchup-1', 'player-1', 'player-2', 'fourball-A'),
        createMatchup('matchup-2', 'player-3', 'player-4', 'fourball-B'),
      ]));
      
      const { pairMatchups } = await import('../services/matchupService');

      await expect(pairMatchups(tournamentId, 'matchup-1', 'matchup-2'))
        .rejects.toThrow('One or both matchups are already part of a different fourball.');
    });

    it('should successfully pair two unpaired matchups', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ];

      // Returns for: pairMatchups tournament fetch, updateGamePermissionsForFourball tournament fetch, game1 fetch, game2 fetch
      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createTournamentSnap(true, [
          { ...matchups[0], fourballId: mockUUID },
          { ...matchups[1], fourballId: mockUUID },
        ]))
        .mockResolvedValueOnce(createGameSnap(true, {}))
        .mockResolvedValueOnce(createGameSnap(true, {}));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { pairMatchups } = await import('../services/matchupService');

      await pairMatchups(tournamentId, 'matchup-1', 'matchup-2');

      // Verify tournament was updated with new fourballId
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          matchups: expect.arrayContaining([
            expect.objectContaining({ id: 'matchup-1', fourballId: mockUUID }),
            expect.objectContaining({ id: 'matchup-2', fourballId: mockUUID }),
          ]),
        })
      );
    });

    it('should allow pairing if both matchups share the same fourballId', async () => {
      const sharedFourballId = 'shared-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', sharedFourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', sharedFourballId),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, {}))
        .mockResolvedValueOnce(createGameSnap(true, {}));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { pairMatchups } = await import('../services/matchupService');

      await pairMatchups(tournamentId, 'matchup-1', 'matchup-2');

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('unpairFourball', () => {
    it('should throw an error if tournament not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(false));
      
      const { unpairFourball } = await import('../services/matchupService');

      await expect(unpairFourball(tournamentId, 'fourball-1'))
        .rejects.toThrow(`Tournament with ID ${tournamentId} not found.`);
    });

    it('should throw an error if tournament data is missing matchups', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true));
      
      const { unpairFourball } = await import('../services/matchupService');

      await expect(unpairFourball(tournamentId, 'fourball-1'))
        .rejects.toThrow(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    });

    it('should do nothing if no matchups have the given fourballId', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { unpairFourball } = await import('../services/matchupService');

      await unpairFourball(tournamentId, 'nonexistent-fourball');

      // updateDoc should NOT be called since no matchups matched
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should remove fourballId from matchups with matching fourballId', async () => {
      const fourballId = 'fourball-to-unpair';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
        createMatchup('matchup-3', 'player-5', 'player-6', 'other-fourball'),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, { allowedEditors: ['p1', 'p2'] }))
        .mockResolvedValueOnce(createGameSnap(true, { allowedEditors: ['p3', 'p4'] }));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { unpairFourball } = await import('../services/matchupService');

      await unpairFourball(tournamentId, fourballId);

      // First updateDoc call should update tournament
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should remove allowedEditors from unpaired games', async () => {
      const fourballId = 'fourball-to-unpair';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, { id: 'game-1', allowedEditors: ['player-1', 'player-2', 'player-3', 'player-4'] }))
        .mockResolvedValueOnce(createGameSnap(true, { id: 'game-2', allowedEditors: ['player-1', 'player-2', 'player-3', 'player-4'] }));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { unpairFourball } = await import('../services/matchupService');

      await unpairFourball(tournamentId, fourballId);

      // Should have called updateDoc multiple times (once for tournament, once for each game)
      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMatchupsByFourballId', () => {
    it('should throw an error if tournament not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(false));
      
      const { getMatchupsByFourballId } = await import('../services/matchupService');

      await expect(getMatchupsByFourballId(tournamentId, 'fourball-1'))
        .rejects.toThrow(`Tournament with ID ${tournamentId} not found.`);
    });

    it('should throw an error if tournament data is missing matchups', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true));
      
      const { getMatchupsByFourballId } = await import('../services/matchupService');

      await expect(getMatchupsByFourballId(tournamentId, 'fourball-1'))
        .rejects.toThrow(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    });

    it('should return empty array if no matchups have the fourballId', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4', 'other-fourball'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getMatchupsByFourballId } = await import('../services/matchupService');

      const result = await getMatchupsByFourballId(tournamentId, 'nonexistent-fourball');

      expect(result).toEqual([]);
    });

    it('should return matchups with matching fourballId', async () => {
      const fourballId = 'target-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
        createMatchup('matchup-3', 'player-5', 'player-6', 'other-fourball'),
        createMatchup('matchup-4', 'player-7', 'player-8'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getMatchupsByFourballId } = await import('../services/matchupService');

      const result = await getMatchupsByFourballId(tournamentId, fourballId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('matchup-1');
      expect(result[1].id).toBe('matchup-2');
    });
  });

  describe('getUserFourballMatchups', () => {
    it('should throw an error if tournament not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(false));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      await expect(getUserFourballMatchups(tournamentId, 'user-1'))
        .rejects.toThrow(`Tournament with ID ${tournamentId} not found.`);
    });

    it('should throw an error if tournament data is missing matchups', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      await expect(getUserFourballMatchups(tournamentId, 'user-1'))
        .rejects.toThrow(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    });

    it('should return empty array if user has no matchups', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      const result = await getUserFourballMatchups(tournamentId, 'unknown-player');

      expect(result).toEqual([]);
    });

    it('should return only the user direct matchup if not in a fourball', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      const result = await getUserFourballMatchups(tournamentId, 'player-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('matchup-1');
    });

    it('should return user matchup and fourball partner matchups', async () => {
      const fourballId = 'shared-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
        createMatchup('matchup-3', 'player-5', 'player-6'),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      const result = await getUserFourballMatchups(tournamentId, 'player-1');

      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toContain('matchup-1');
      expect(result.map(m => m.id)).toContain('matchup-2');
    });

    it('should work when user is the europe player', async () => {
      const fourballId = 'shared-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      const result = await getUserFourballMatchups(tournamentId, 'player-2');

      expect(result).toHaveLength(2);
    });

    it('should not include duplicate matchups', async () => {
      const fourballId = 'shared-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc.mockResolvedValue(createTournamentSnap(true, matchups));
      
      const { getUserFourballMatchups } = await import('../services/matchupService');

      const result = await getUserFourballMatchups(tournamentId, 'player-1');

      // Each matchup should appear only once
      const uniqueIds = new Set(result.map(m => m.id));
      expect(uniqueIds.size).toBe(result.length);
    });
  });

  describe('updateGamePermissionsForFourball', () => {
    it('should throw an error if tournament not found', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(false));
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await expect(updateGamePermissionsForFourball(tournamentId))
        .rejects.toThrow(`Tournament with ID ${tournamentId} not found.`);
    });

    it('should throw an error if tournament data is missing matchups', async () => {
      mockGetDoc.mockResolvedValue(createTournamentSnap(true));
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await expect(updateGamePermissionsForFourball(tournamentId))
        .rejects.toThrow(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    });

    it('should update allowedEditors for games in a fourball', async () => {
      const fourballId = 'test-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, {}))
        .mockResolvedValueOnce(createGameSnap(true, {}));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await updateGamePermissionsForFourball(tournamentId, fourballId);

      // Should update both games with all four player IDs
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          allowedEditors: expect.arrayContaining(['player-1', 'player-2', 'player-3', 'player-4']),
        })
      );
    });

    it('should remove allowedEditors from games not in a fourball when processing all', async () => {
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2'),
        createMatchup('matchup-2', 'player-3', 'player-4'),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, { id: 'game-1', allowedEditors: ['old-editors'] }))
        .mockResolvedValueOnce(createGameSnap(true, { id: 'game-2', allowedEditors: ['old-editors'] }));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await updateGamePermissionsForFourball(tournamentId);

      // Should update games to remove allowedEditors
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('should only process matchups for specified fourballId when provided', async () => {
      const fourballId = 'target-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
        createMatchup('matchup-3', 'player-5', 'player-6', 'other-fourball'),
        createMatchup('matchup-4', 'player-7', 'player-8'),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, {}))
        .mockResolvedValueOnce(createGameSnap(true, {}));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await updateGamePermissionsForFourball(tournamentId, fourballId);

      // 2 updates for the fourball games only
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('should not update games if game document does not exist', async () => {
      const fourballId = 'test-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(false))
        .mockResolvedValueOnce(createGameSnap(false));
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      await updateGamePermissionsForFourball(tournamentId, fourballId);

      // No updates should happen since games don't exist
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should continue processing other games if one fails', async () => {
      const fourballId = 'test-fourball';
      const matchups = [
        createMatchup('matchup-1', 'player-1', 'player-2', fourballId),
        createMatchup('matchup-2', 'player-3', 'player-4', fourballId),
      ];

      mockGetDoc
        .mockResolvedValueOnce(createTournamentSnap(true, matchups))
        .mockResolvedValueOnce(createGameSnap(true, {}))
        .mockRejectedValueOnce(new Error('Network error'));

      mockUpdateDoc.mockResolvedValue(undefined);
      
      const { updateGamePermissionsForFourball } = await import('../services/matchupService');

      // Should not throw, just log error and continue
      await updateGamePermissionsForFourball(tournamentId, fourballId);

      // First game should still be updated
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });
});
