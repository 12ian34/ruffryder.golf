import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

const LOCAL_STORAGE_KEY = 'ruffryder_games';

export function useGameData(userId: string | undefined, linkedPlayerId: string | null, isAdmin: boolean) {
  const [games, setGames] = useState<Game[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [tournamentSettings, setTournamentSettings] = useState<{ useHandicaps: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    // Don't load from local storage until we have an active tournament
    if (!activeTournamentId || !tournamentSettings) {
      return;
    }

    try {
      const savedGames = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedGames !== null) {
        const parsedGames = JSON.parse(savedGames as string);
        // Add tournamentId and useHandicaps to each game if missing
        const gamesWithSettings = parsedGames.map((game: Game) => ({
          ...game,
          tournamentId: activeTournamentId, // Always use the current activeTournamentId
          useHandicaps: tournamentSettings.useHandicaps // Always use current tournament settings
        }));
        setGames(gamesWithSettings);
      }
    } catch (err) {
      console.error('Error loading games from local storage:', err);
    }
  }, [activeTournamentId, tournamentSettings]);

  useEffect(() => {
    if (!userId) {
      setError('User ID not found');
      setIsLoading(false);
      return;
    }

    let unsubscribeGames: (() => void) | undefined;
    let isMounted = true;

    const unsubscribeTournament = onSnapshot(
      collection(db, 'tournaments'),
      async (snapshot) => {
        const activeTournament = snapshot.docs.find(doc => doc.data().isActive);
        if (activeTournament) {
          const tournamentId = activeTournament.id;
          const tournamentData = activeTournament.data();
          setActiveTournamentId(tournamentId);
          setTournamentSettings({
            useHandicaps: tournamentData.useHandicaps ?? false
          });

          if (unsubscribeGames) {
            unsubscribeGames();
          }

          unsubscribeGames = onSnapshot(
            collection(db, 'tournaments', tournamentId, 'games'),
            async (gamesSnapshot) => {
              if (!isMounted) return;

              try {
                const gamesData = gamesSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  tournamentId, // Always include tournamentId
                  useHandicaps: tournamentData.useHandicaps ?? false // Include useHandicaps in each game
                })) as Game[];

                const filteredGames = isAdmin 
                  ? gamesData 
                  : gamesData.filter(game => 
                      linkedPlayerId !== null && game.playerIds?.includes(linkedPlayerId)
                    );

                const sortedGames = sortGames(filteredGames);
                setGames(sortedGames);
                setIsLoading(false);
                setError(null);

                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sortedGames));
                } catch (err) {
                  console.error('Error saving games to local storage:', err);
                }
              } catch (err) {
                if (isMounted) {
                  console.error('Failed to process games data:', err);
                  setError('Failed to process games data');
                  setIsLoading(false);
                }
              }
            },
            (err) => {
              if (isMounted) {
                console.error('Failed to load games:', err);
                setError('Failed to load games');
                setIsLoading(false);
              }
            }
          );
        } else {
          if (isMounted) {
            setGames([]);
            setTournamentSettings(null);
            setIsLoading(false);
          }
        }
      },
      (err) => {
        if (isMounted) {
          console.error('Failed to load tournament:', err);
          setError('Failed to load tournament');
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeTournament();
      if (unsubscribeGames) {
        unsubscribeGames();
      }
    };
  }, [userId, linkedPlayerId, isAdmin]);

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

  const handleGameStatusChange = async (game: Game, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (!isAdmin || !activeTournamentId) {
      throw new Error('You do not have permission to change game status');
    }

    try {
      const updates: Partial<Game> = {};

      switch (newStatus) {
        case 'not_started':
          updates.isStarted = false;
          updates.isComplete = false;
          break;
        case 'in_progress':
          updates.isStarted = true;
          updates.isComplete = false;
          break;
        case 'complete':
          // Check if all holes have scores
          const hasAllScores = game.holes.every(hole => 
            typeof hole.usaPlayerScore === 'number' && 
            typeof hole.europePlayerScore === 'number'
          );

          if (!hasAllScores) {
            throw new Error('All holes must have scores before marking the game as complete');
          }

          // Validate scores are reasonable
          const hasInvalidScores = game.holes.some(hole => 
            (hole.usaPlayerScore !== undefined && hole.usaPlayerScore !== null && (hole.usaPlayerScore < 1 || hole.usaPlayerScore > 20)) ||
            (hole.europePlayerScore !== undefined && hole.europePlayerScore !== null && (hole.europePlayerScore < 1 || hole.europePlayerScore > 20))
          );

          if (hasInvalidScores) {
            throw new Error('All scores must be between 1 and 20');
          }

          updates.isComplete = true;
          updates.isStarted = true;
          break;
      }

      await updateDoc(doc(db, 'tournaments', activeTournamentId, 'games', game.id), updates);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update game status');
    }
  };

  return {
    games,
    isLoading,
    error,
    handleGameStatusChange,
    activeTournamentId,
    isOnline,
    tournamentSettings
  };
}