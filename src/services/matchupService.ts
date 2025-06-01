import { doc, getDoc, updateDoc, DocumentReference } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament, Matchup } from '../types/tournament';

// Helper to get tournament document reference
const getTournamentRef = (tournamentId: string): DocumentReference<Tournament> => {
  return doc(db, 'tournaments', tournamentId) as DocumentReference<Tournament>;
};

/**
 * Pairs two matchups by assigning them a shared, new fourballId.
 * Assumes the matchups are not already part of other conflicting fourballs.
 * The UI should filter to present only eligible matchups for pairing.
 */
export async function pairMatchups(tournamentId: string, matchup1Id: string, matchup2Id: string): Promise<void> {
  if (matchup1Id === matchup2Id) {
    throw new Error("Cannot pair a matchup with itself.");
  }

  const tournamentRef = getTournamentRef(tournamentId);
  const newFourballId = crypto.randomUUID();

  try {
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }

    const tournamentData = tournamentSnap.data();
    if (!tournamentData || !tournamentData.matchups) {
      throw new Error(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    }
    
    const m1Initial = tournamentData.matchups.find(m => m.id === matchup1Id);
    const m2Initial = tournamentData.matchups.find(m => m.id === matchup2Id);

    if (!m1Initial) {
        throw new Error(`Matchup with ID ${matchup1Id} not found in tournament ${tournamentId}.`);
    }
    if (!m2Initial) {
        throw new Error(`Matchup with ID ${matchup2Id} not found in tournament ${tournamentId}.`);
    }

    // Prevent pairing if either is already in a *different* fourball.
    // The UI should ideally prevent this, but safeguard here.
    if ((m1Initial.fourballId && m1Initial.fourballId !== m2Initial.fourballId) ||
        (m2Initial.fourballId && m2Initial.fourballId !== m1Initial.fourballId)) {
      // This logic handles cases where:
      // 1. m1 is paired, m2 is not.
      // 2. m2 is paired, m1 is not.
      // 3. m1 and m2 are paired, but to different fourballIds.
      // It correctly allows pairing if one is paired and the other is its partner (m1.fourballId === m2.fourballId),
      // or if both are unpaired.
      throw new Error("One or both matchups are already part of a different fourball. Please unpair them first.");
    }


    let foundMatchup1 = false;
    let foundMatchup2 = false;

    const updatedMatchups = tournamentData.matchups.map(m => {
      if (m.id === matchup1Id) {
        foundMatchup1 = true;
        return { ...m, fourballId: newFourballId };
      }
      if (m.id === matchup2Id) {
        foundMatchup2 = true;
        return { ...m, fourballId: newFourballId };
      }
      return m;
    });

    // This check is somewhat redundant due to m1Initial/m2Initial checks but kept for safety.
    if (!foundMatchup1 || !foundMatchup2) {
      const missingIds = [];
      if (!foundMatchup1) missingIds.push(matchup1Id);
      if (!foundMatchup2) missingIds.push(matchup2Id);
      throw new Error(`One or more matchups could not be updated (this should not happen if initial find was successful): ${missingIds.join(', ')}`);
    }

    await updateDoc(tournamentRef, { matchups: updatedMatchups });
    console.log(`Matchups ${matchup1Id} and ${matchup2Id} paired with fourballId ${newFourballId} in tournament ${tournamentId}.`);

    // Update game permissions for the newly created fourball
    await updateGamePermissionsForFourball(tournamentId, newFourballId);

  } catch (error) {
    console.error(`Error pairing matchups ${matchup1Id}, ${matchup2Id} in tournament ${tournamentId}:`, error);
    throw error; 
  }
}

/**
 * Unpairs all matchups associated with a given fourballId within a tournament.
 * It removes the fourballId field from these matchups.
 */
export async function unpairFourball(tournamentId: string, fourballIdToUnpair: string): Promise<void> {
  const tournamentRef = getTournamentRef(tournamentId);

  try {
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }

    const tournamentData = tournamentSnap.data();
    if (!tournamentData || !tournamentData.matchups) {
      throw new Error(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    }

    let matchupsUnpairedCount = 0;
    const updatedMatchups = tournamentData.matchups.map(m => {
      if (m.fourballId === fourballIdToUnpair) {
        matchupsUnpairedCount++;
        const { fourballId, ...rest } = m; // Create new object without fourballId
        return rest;
      }
      return m;
    });

    if (matchupsUnpairedCount === 0) {
      console.warn(`No matchups found with fourballId ${fourballIdToUnpair} in tournament ${tournamentId} to unpair.`);
      return; // No update needed if no matchups were changed
    }

    await updateDoc(tournamentRef, { matchups: updatedMatchups });
    console.log(`${matchupsUnpairedCount} matchup(s) with fourballId ${fourballIdToUnpair} have been unpaired in tournament ${tournamentId}.`);

    // Update game permissions to remove allowedEditors for unpaired games
    await updateGamePermissionsForFourball(tournamentId);

  } catch (error) {
    console.error(`Error unpairing fourball ${fourballIdToUnpair} in tournament ${tournamentId}:`, error);
    throw error;
  }
}

/**
 * Fetches all matchups from a tournament that share a specific fourballId.
 */
export async function getMatchupsByFourballId(tournamentId: string, fourballId: string): Promise<Matchup[]> {
  const tournamentRef = getTournamentRef(tournamentId);

  try {
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }
    const tournamentData = tournamentSnap.data();
    if (!tournamentData || !tournamentData.matchups) {
      throw new Error(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    }
    
    return tournamentData.matchups.filter(m => m.fourballId === fourballId);
  } catch (error) {
    console.error(`Error fetching matchups by fourballId ${fourballId} in tournament ${tournamentId}:`, error);
    throw error;
  }
}

/**
 * Fetches all matchups relevant to a given user in a tournament.
 * This includes their direct matchups and any other matchups sharing a fourballId with their direct matchups.
 */
export async function getUserFourballMatchups(tournamentId: string, userId: string): Promise<Matchup[]> {
  const tournamentRef = getTournamentRef(tournamentId);

  try {
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }
    const tournamentData = tournamentSnap.data();
    if (!tournamentData || !tournamentData.matchups) {
      throw new Error(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    }
    const allMatchups = tournamentData.matchups;

    const userDirectMatchups = allMatchups.filter(m => m.usaPlayerId === userId || m.europePlayerId === userId);

    // Using a Map to store results ensures uniqueness by matchup ID.
    const matchupsMap = new Map<string, Matchup>();

    for (const directMatchup of userDirectMatchups) {
      matchupsMap.set(directMatchup.id, directMatchup); // Add user's direct matchup

      if (directMatchup.fourballId) {
        // Find all matchups belonging to this fourballId and add them
        const fourballPartnersAndSelf = allMatchups.filter(
          m => m.fourballId === directMatchup.fourballId
        );
        for (const matchupInFourball of fourballPartnersAndSelf) {
          matchupsMap.set(matchupInFourball.id, matchupInFourball);
        }
      }
    }
    
    return Array.from(matchupsMap.values());

  } catch (error) {
    console.error(`Error fetching user's fourball matchups for tournament ${tournamentId}, user ${userId}:`, error);
    throw error;
  }
}

/**
 * Updates allowedEditors field for games based on fourball matchup pairings.
 * This ensures that all players in a fourball can edit any game in their fourball.
 */
export async function updateGamePermissionsForFourball(tournamentId: string, fourballId?: string): Promise<void> {
  try {
    const tournamentRef = getTournamentRef(tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }

    const tournamentData = tournamentSnap.data();
    if (!tournamentData || !tournamentData.matchups) {
      throw new Error(`Tournament data or matchups array is missing for ID ${tournamentId}.`);
    }

    const allMatchups = tournamentData.matchups;
    
    // If fourballId is provided, only update games for that specific fourball
    // Otherwise, update all games in the tournament
    const matchupsToProcess = fourballId 
      ? allMatchups.filter(m => m.fourballId === fourballId)
      : allMatchups;

    // Group matchups by fourballId
    const fourballGroups: Record<string, Matchup[]> = {};
    matchupsToProcess.forEach(matchup => {
      if (matchup.fourballId) {
        if (!fourballGroups[matchup.fourballId]) {
          fourballGroups[matchup.fourballId] = [];
        }
        fourballGroups[matchup.fourballId].push(matchup);
      }
    });

    // Update games for each fourball group
    for (const [fbId, matchups] of Object.entries(fourballGroups)) {
      if (matchups.length === 2) {
        // Get all player IDs from both matchups in the fourball
        const allPlayerIds = [
          matchups[0].usaPlayerId,
          matchups[0].europePlayerId,
          matchups[1].usaPlayerId,
          matchups[1].europePlayerId
        ];

        // Update each game in the fourball to allow all four players to edit
        for (const matchup of matchups) {
          const gameRef = doc(db, 'tournaments', tournamentId, 'games', matchup.id);
          try {
            const gameSnap = await getDoc(gameRef);
            if (gameSnap.exists()) {
              await updateDoc(gameRef, {
                allowedEditors: allPlayerIds
              });
              console.log(`Updated allowedEditors for game ${matchup.id} in fourball ${fbId}`);
            }
          } catch (error) {
            console.error(`Error updating game ${matchup.id}:`, error);
            // Continue with other games even if one fails
          }
        }
      }
    }

    // For matchups without fourballId, remove allowedEditors field
    const singleMatchups = allMatchups.filter(m => !m.fourballId);
    for (const matchup of singleMatchups) {
      const gameRef = doc(db, 'tournaments', tournamentId, 'games', matchup.id);
      try {
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          const gameData = gameSnap.data();
          if (gameData.allowedEditors) {
            // Remove the allowedEditors field by updating without it
            const { allowedEditors, ...gameDataWithoutAllowedEditors } = gameData;
            await updateDoc(gameRef, gameDataWithoutAllowedEditors);
            console.log(`Removed allowedEditors for game ${matchup.id} (no longer in fourball)`);
          }
        }
      } catch (error) {
        console.error(`Error removing allowedEditors from game ${matchup.id}:`, error);
        // Continue with other games even if one fails
      }
    }

  } catch (error) {
    console.error(`Error updating game permissions for fourball in tournament ${tournamentId}:`, error);
    throw error;
  }
} 