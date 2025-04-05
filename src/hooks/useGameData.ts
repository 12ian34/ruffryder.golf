import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Game, TournamentSettings, GameStatus } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';

export function useGameData(tournamentId: string | undefined, linkedPlayerId: string | null, isAdmin: boolean) {
  const [games, setGames] = useState<Game[]>([]);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !auth.currentUser) {
      setGames([]);
      setTournamentSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let unsubscribeTournament: (() => void) | undefined;
    let unsubscribeGames: (() => void) | undefined;

    const cleanupListeners = () => {
      if (unsubscribeTournament) {
        unsubscribeTournament();
        unsubscribeTournament = undefined;
      }
      if (unsubscribeGames) {
        unsubscribeGames();
        unsubscribeGames = undefined;
      }
    };

    const setupListeners = () => {
      // Set up real-time listener for tournament settings
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      unsubscribeTournament = onSnapshot(tournamentRef, (doc) => {
        if (doc.exists()) {
          const tournamentData = doc.data();
          const settings = {
            id: doc.id,
            useHandicaps: tournamentData.useHandicaps || false,
            handicapStrokes: tournamentData.handicapStrokes || 0,
            higherHandicapTeam: tournamentData.higherHandicapTeam || 'USA'
          };
          setTournamentSettings(settings);

          // Set up real-time listener for games only after tournament data is loaded
          const gamesRef = collection(db, 'tournaments', tournamentId, 'games');
          unsubscribeGames = onSnapshot(gamesRef, (snapshot) => {
            const gamesData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                tournamentId,
                playerIds: data.playerIds || [],
                points: data.points || {
                  raw: { USA: 0, EUROPE: 0 },
                  adjusted: { USA: 0, EUROPE: 0 }
                },
                status: data.status || 'not_started',
                isStarted: data.isStarted || false,
                isComplete: data.isComplete || false
              } as Game;
            });
            // Sort games before setting state
            const sortedGames = sortGames(gamesData);
            setGames(sortedGames);
            setIsLoading(false);
          }, (error) => {
            console.error('Error in games listener:', error);
            setGames([]);
            setIsLoading(false);
          });
        } else {
          setTournamentSettings(null);
          setGames([]);
          setIsLoading(false);
        }
      }, (error) => {
        console.error('Error in tournament settings listener:', error);
        setTournamentSettings(null);
        setGames([]);
        setIsLoading(false);
      });
    };

    // Set up auth state change listener
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      cleanupListeners();
      
      if (user) {
        setupListeners();
      } else {
        setTournamentSettings(null);
        setGames([]);
        setIsLoading(false);
      }
    });

    // Initial setup if already authenticated
    if (auth.currentUser) {
      setupListeners();
    }

    // Cleanup function
    return () => {
      cleanupListeners();
      unsubscribeAuth();
    };
  }, [tournamentId]);

  const sortGames = (games: Game[]): Game[] => {
    return [...games].sort((a, b) => {
      if (a.isComplete !== b.isComplete) {
        return a.isComplete ? 1 : -1;
      }
      if (a.isStarted !== b.isStarted) {
        return a.isStarted ? -1 : 1;
      }
      return a.usaPlayerName.localeCompare(b.usaPlayerName);
    });
  };

  const handleGameStatusChange = async (game: Game, newStatus: GameStatus) => {
    if (!tournamentId || !tournamentSettings?.id) {
      throw new Error('Missing required IDs');
    }

    if (!game.id) {
      throw new Error('Game ID is required');
    }

    // Check if user is admin or a player in the game
    const isPlayerInGame = linkedPlayerId && game.playerIds?.includes(linkedPlayerId);

    if (!isAdmin && !isPlayerInGame) {
      throw new Error('Permission denied: User is neither admin nor player in game');
    }

    // Only allow actual game statuses, not 'all'
    if (newStatus === 'all') {
      throw new Error('Invalid status: all');
    }

    try {
      const gameRef = doc(db, 'tournaments', tournamentId, 'games', game.id);
      
      // Validate we have all required fields before updating
      if (!game.usaPlayerId || !game.europePlayerId || !game.usaPlayerName || !game.europePlayerName) {
        throw new Error('Missing required game fields');
      }

      await updateDoc(gameRef, {
        // Preserve existing fields
        usaPlayerId: game.usaPlayerId,
        europePlayerId: game.europePlayerId,
        usaPlayerName: game.usaPlayerName,
        europePlayerName: game.europePlayerName,
        tournamentId: game.tournamentId,
        playerIds: game.playerIds || [],
        // Update status fields
        status: newStatus,
        isStarted: newStatus !== 'not_started',
        isComplete: newStatus === 'complete',
        // If moving back to in_progress, ensure points don't count in total
        points: newStatus === 'in_progress' ? {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        } : (game.points || {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        }),
        updatedAt: serverTimestamp()
      });

      // Only update tournament scores if user is admin
      if (isAdmin) {
        await updateTournamentScores(tournamentId);
      }
    } catch (error: any) {
      console.error('Error updating game status:', error);
      console.error('Error details:', {
        errorCode: error.code,
        errorMessage: error.message,
        gameId: game.id || '',
        tournamentId,
        isAdmin,
        isPlayerInGame: isPlayerInGame,
        linkedPlayerId,
        game: JSON.stringify(game)
      });
      throw error; // Re-throw to let caller handle the error
    }
  };

  return {
    games,
    handleGameStatusChange,
    tournamentSettings,
    isLoading
  };
}