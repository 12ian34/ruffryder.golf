import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game, TournamentSettings, GameStatus } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';

export function useGameData(tournamentId: string | undefined, linkedPlayerId: string | null, isAdmin: boolean) {
  const [games, setGames] = useState<Game[]>([]);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setGames([]);
      setTournamentSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Set up real-time listener for tournament settings
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const unsubscribeTournament = onSnapshot(tournamentRef, (doc) => {
      if (doc.exists()) {
        const tournamentData = doc.data();
        const settings = {
          id: doc.id,
          useHandicaps: tournamentData.useHandicaps || false,
          handicapStrokes: tournamentData.handicapStrokes || 0,
          higherHandicapTeam: tournamentData.higherHandicapTeam || 'USA'
        };
        console.log('Tournament settings updated:', settings);
        setTournamentSettings(settings);
      } else {
        console.log('No tournament found');
        setTournamentSettings(null);
        setGames([]);
        setIsLoading(false);
        return;
      }
    });

    // Set up real-time listener for games
    const gamesRef = collection(db, 'tournaments', tournamentId, 'games');
    const unsubscribeGames = onSnapshot(gamesRef, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const game: Game = {
          id: doc.id,
          tournamentId,
          usaPlayerId: data.usaPlayerId,
          usaPlayerName: data.usaPlayerName,
          europePlayerId: data.europePlayerId,
          europePlayerName: data.europePlayerName,
          handicapStrokes: data.handicapStrokes || 0,
          higherHandicapTeam: data.higherHandicapTeam || 'USA',
          holes: data.holes || [],
          strokePlayScore: data.strokePlayScore || { USA: 0, EUROPE: 0, adjustedUSA: 0, adjustedEUROPE: 0 },
          matchPlayScore: data.matchPlayScore || { USA: 0, EUROPE: 0, adjustedUSA: 0, adjustedEUROPE: 0 },
          points: data.points || {
            raw: { USA: 0, EUROPE: 0 },
            adjusted: { USA: 0, EUROPE: 0 }
          },
          isComplete: data.isComplete || false,
          isStarted: data.isStarted || false,
          playerIds: data.playerIds || [],
          status: data.status || 'not_started'
        };
        console.log('Game data processed:', game);
        return game;
      });

      const filteredGames = isAdmin 
        ? gamesData 
        : gamesData.filter(game => 
            linkedPlayerId !== null && game.playerIds?.includes(linkedPlayerId)
          );

      const sortedGames = sortGames(filteredGames);
      console.log('Final games list:', sortedGames);
      setGames(sortedGames);
      setIsLoading(false);
    });

    return () => {
      unsubscribeTournament();
      unsubscribeGames();
    };
  }, [tournamentId, isAdmin, linkedPlayerId]);

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
    if (!tournamentId || !isAdmin || !tournamentSettings?.id) return;

    // Only allow actual game statuses, not 'all'
    if (newStatus === 'all') return;

    try {
      const gameRef = doc(db, 'tournaments', tournamentSettings.id, 'games', game.id);
      await updateDoc(gameRef, {
        status: newStatus,
        isStarted: newStatus !== 'not_started',
        isComplete: newStatus === 'complete',
        // If moving back to in_progress, ensure points don't count in total
        points: newStatus === 'in_progress' ? {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        } : game.points,
        updatedAt: serverTimestamp()
      });

      // Update tournament scores to reflect the change
      await updateTournamentScores(tournamentId);
    } catch (error) {
      console.error('Error updating game status:', error);
    }
  };

  return {
    games,
    handleGameStatusChange,
    tournamentSettings,
    isLoading
  };
}