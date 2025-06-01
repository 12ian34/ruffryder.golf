import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Tournament } from '../types/tournament';
import { Game } from '../types/game';
import { Player } from '../types/player';
import type { AnalyzableTournamentData } from '../utils/statsAnalysis';

export function useTournamentStats() {
  const [analyzableData, setAnalyzableData] = useState<AnalyzableTournamentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournamentStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Find the active tournament
        const tournamentsRef = collection(db, 'tournaments');
        const qTournaments = query(tournamentsRef, where('isActive', '==', true));
        const tournamentSnapshot = await getDocs(qTournaments);

        if (tournamentSnapshot.empty) {
          setError('No active tournament found.');
          setAnalyzableData(null); // Explicitly set to null if no active tournament
          setIsLoading(false);
          return;
        }
        // Assuming there's only one active tournament for simplicity
        const activeTournamentDoc = tournamentSnapshot.docs[0];
        const activeTournament = { id: activeTournamentDoc.id, ...activeTournamentDoc.data() } as Tournament;

        // 2. Fetch games for the active tournament
        const gamesSubcollectionPath = `tournaments/${activeTournament.id}/games`;
        const gamesRef = collection(db, gamesSubcollectionPath);
        const gamesSnapshot = await getDocs(gamesRef);

        const tournamentGames = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));

        if (tournamentGames.length === 0) {
            setAnalyzableData({
                tournamentInfo: activeTournament,
                games: [],
                players: [],
            });
            setIsLoading(false);
            return;
        }

        // 3. Fetch all unique players involved in these games
        const playerIds = new Set<string>();
        tournamentGames.forEach(game => {
          if (game.usaPlayerId) playerIds.add(game.usaPlayerId);
          if (game.europePlayerId) playerIds.add(game.europePlayerId);
        });

        const uniquePlayerIds = Array.from(playerIds);
        const players: Player[] = [];

        // Firestore 'in' query supports up to 30 equality clauses. If more players, batching is needed.
        // For now, assuming player count will be < 30 for a single tournament's games.
        // If this assumption is wrong, this part needs to be more robust.
        if (uniquePlayerIds.length > 0) {
            // Check if playerIds exceed Firestore limit for 'in' query (currently 30)
            const CHUNK_SIZE = 30;
            for (let i = 0; i < uniquePlayerIds.length; i += CHUNK_SIZE) {
                const chunk = uniquePlayerIds.slice(i, i + CHUNK_SIZE);
                if (chunk.length > 0) {
                    // const playersRef = collection(db, 'players'); // This line is part of the unused qPlayers logic
                    // const qPlayers = query(playersRef, where('id', 'in', chunk)); // Unused variable
                    
                    // Correction: Firestore queries for document ID use `documentId()` with `where`
                    // If player documents are stored with their ID as the document ID:
                    // const qPlayers = query(playersRef, where(documentId(), 'in', chunk));
                    // For now, assuming 'id' is a field within the player document.
                    // If player IDs are the actual Firestore document IDs, we would fetch them individually or adjust the query.
                    // Let's assume for now players are fetched one by one if `id` field is not queryable directly or for simplicity
                    // This part is less efficient if `id` is not an indexed field designed for `in` queries.
                    // A more robust way if player IDs are document IDs: 
                    const playerPromises = chunk.map(id => getDoc(doc(db, 'players', id)));
                    const playerDocsSnapshots = await Promise.all(playerPromises);
                    playerDocsSnapshots.forEach(playerDoc => {
                        if (playerDoc.exists()) {
                            players.push({ id: playerDoc.id, ...playerDoc.data() } as Player);
                        }
                    });
                }
            }
        }
        
        setAnalyzableData({
          tournamentInfo: activeTournament,
          games: tournamentGames,
          players: players,
        });

      } catch (err: any) {
        console.error("Error fetching tournament stats data:", err);
        setError(err.message || 'Failed to fetch tournament statistics.');
        setAnalyzableData(null); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentStats();
  }, []); // Empty dependency array means this effect runs once on mount

  return { analyzableData, isLoading, error };
} 