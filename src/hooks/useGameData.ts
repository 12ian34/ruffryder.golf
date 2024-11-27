import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

export function useGameData(userId: string | undefined, linkedPlayerId: string | null, isAdmin: boolean) {
  const [games, setGames] = useState<Game[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError('User ID not found');
      setIsLoading(false);
      return;
    }

    const unsubscribeTournament = onSnapshot(
      collection(db, 'tournaments'),
      async (snapshot) => {
        const activeTournament = snapshot.docs.find(doc => doc.data().isActive);
        if (activeTournament) {
          setActiveTournamentId(activeTournament.id);

          const unsubscribeGames = onSnapshot(
            collection(db, 'tournaments', activeTournament.id, 'games'),
            async (gamesSnapshot) => {
              const gamesData = gamesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tournamentId: activeTournament.id
              })) as Game[];

              const filteredGames = isAdmin 
                ? gamesData 
                : gamesData.filter(game => 
                    game.playerIds?.includes(linkedPlayerId)
                  );

              setGames(sortGames(filteredGames));
              setIsLoading(false);
            },
            (err) => {
              console.error('Error fetching games:', err);
              setError('Failed to load games');
              setIsLoading(false);
            }
          );

          return () => unsubscribeGames();
        } else {
          setGames([]);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching tournament:', err);
        setError('Failed to load tournament');
        setIsLoading(false);
      }
    );

    return () => unsubscribeTournament();
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
    if (!isAdmin || !activeTournamentId) return;

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

          updates.isComplete = true;
          updates.isStarted = true;
          break;
      }

      await updateDoc(doc(db, 'tournaments', activeTournamentId, 'games', game.id), updates);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  return {
    games,
    isLoading,
    error,
    handleGameStatusChange,
    activeTournamentId
  };
}