import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, doc, onSnapshot, updateDoc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Game, TournamentSettings, GameStatus } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';
import { getUserFourballMatchups } from '../services/matchupService';

export function useGameData(
  tournamentId: string | undefined,
  currentUserId: string | null,
  linkedPlayerId: string | null,
  isAdmin: boolean
) {
  const [games, setGames] = useState<Game[]>([]);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userFourballMatchupIds, setUserFourballMatchupIds] = useState<string[]>([]);
  const isMounted = useRef(true);
  const authStateRef = useRef<boolean>(!!auth.currentUser);
  const listenersRef = useRef<{
    tournament: (() => void) | undefined;
    games: (() => void) | undefined;
    auth: (() => void) | undefined;
  }>({
    tournament: undefined,
    games: undefined,
    auth: undefined
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const formatGameData = (id: string, data: any, tournamentId: string): Game => {
    return {
      ...data,
      id,
      tournamentId,
      playerIds: data.playerIds || [],
      points: data.points || {
        raw: { USA: 0, EUROPE: 0 },
        adjusted: { USA: 0, EUROPE: 0 }
      },
      status: data.status || 'not_started',
      isStarted: data.isStarted || false,
      isComplete: data.isComplete || false,
      startTime: data.startTime?.toDate ? data.startTime.toDate() : undefined,
      endTime: data.endTime?.toDate ? data.endTime.toDate() : undefined,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
    } as Game;
  };

  const sortGames = useCallback((gamesToSort: Game[]): Game[] => {
    return [...gamesToSort].sort((a, b) => {
      const isPlayerInGameA = linkedPlayerId && a.playerIds?.includes(linkedPlayerId);
      const isPlayerInGameB = linkedPlayerId && b.playerIds?.includes(linkedPlayerId);

      if (isPlayerInGameA !== isPlayerInGameB) {
        return isPlayerInGameA ? -1 : 1;
      }

      if (a.isComplete !== b.isComplete) {
        return a.isComplete ? 1 : -1;
      }
      if (a.isStarted !== b.isStarted) {
        return a.isStarted ? -1 : 1;
      }
      return (a.usaPlayerName || '').localeCompare(b.usaPlayerName || '');
    });
  }, [linkedPlayerId]);

  useEffect(() => {
    if (!tournamentId) {
      setGames([]);
      setTournamentSettings(null);
      setIsLoading(false);
      return;
    }

    const cleanupListeners = () => {
      if (listenersRef.current.games) {
        listenersRef.current.games();
        listenersRef.current.games = undefined;
      }
      if (listenersRef.current.tournament) {
        listenersRef.current.tournament();
        listenersRef.current.tournament = undefined;
      }
    };

    const setupListeners = () => {
      if (!auth.currentUser || !isMounted.current) {
        if (isMounted.current) {
          setGames([]);
          setTournamentSettings(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      listenersRef.current.tournament = onSnapshot(tournamentRef, async (tournamentDoc) => {
        if (!isMounted.current || !authStateRef.current) return;

        if (tournamentDoc.exists()) {
          const tournamentDocData = tournamentDoc.data();
          const settings = {
            id: tournamentDoc.id,
            useHandicaps: tournamentDocData.useHandicaps || false,
            handicapStrokes: tournamentDocData.handicapStrokes || 0,
            higherHandicapTeam: tournamentDocData.higherHandicapTeam || 'USA',
            isComplete: tournamentDocData.isComplete || false
          };
          setTournamentSettings(settings);

          if (listenersRef.current.games) {
            listenersRef.current.games();
            listenersRef.current.games = undefined;
          }

          if (isAdmin) {
            const gamesCollRef = collection(db, 'tournaments', tournamentId, 'games');
            listenersRef.current.games = onSnapshot(gamesCollRef, (snapshot) => {
              if (!isMounted.current || !authStateRef.current) return;
              const gamesData = snapshot.docs.map(gameDoc => formatGameData(gameDoc.id, gameDoc.data(), tournamentId));
              // console.log('[Admin] Fetched games:', gamesData.length);
              setGames(sortGames(gamesData));
              setUserFourballMatchupIds([]);
              setIsLoading(false);
            }, (error) => {
              if (!isMounted.current || !authStateRef.current) return;
              console.error('Error in admin games listener:', error);
              setGames([]);
              setUserFourballMatchupIds([]);
              setIsLoading(false);
            });
          } else if (currentUserId && linkedPlayerId) {
            console.log(`[useGameData] Non-admin. Tournament ID: ${tournamentId}, Current User ID (Auth): ${currentUserId}, Linked Player ID (DB): ${linkedPlayerId}`); // DEBUG LOG
            try {
              const userFourballMatchups = await getUserFourballMatchups(tournamentId, linkedPlayerId);
              console.log('[useGameData] userFourballMatchups:', userFourballMatchups); // DEBUG LOG

              const gameIdsToFetch = userFourballMatchups.map(m => m.id);
              setUserFourballMatchupIds(gameIdsToFetch);
              console.log('[useGameData] gameIdsToFetch (and userFourballMatchupIds):', gameIdsToFetch); // DEBUG LOG

              if (gameIdsToFetch.length === 0) {
                console.log('[useGameData] No game IDs to fetch for user.'); // DEBUG LOG
                setGames([]);
                setIsLoading(false);
                return;
              }

              const gamePromises = gameIdsToFetch.map(gameId =>
                getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId))
              );
              const gameDocSnaps = await Promise.all(gamePromises);
              const fetchedGames = gameDocSnaps
                .filter(snap => snap.exists())
                .map(snap => formatGameData(snap.id, snap.data(), tournamentId));
              
              console.log('[useGameData] Fetched games for user:', fetchedGames); // DEBUG LOG
              
              setGames(sortGames(fetchedGames));
              setIsLoading(false);

            } catch (error) {
              console.error('[useGameData] Error fetching user fourball games:', error); // DEBUG LOG with prefix
              setGames([]);
              setUserFourballMatchupIds([]);
              setIsLoading(false);
            }
          } else {
            console.log('[useGameData] Not admin, or missing currentUserId or linkedPlayerId.'); // DEBUG LOG
            setGames([]);
            setUserFourballMatchupIds([]);
            setIsLoading(false);
          }
        } else {
          setTournamentSettings(null);
          setGames([]);
          setUserFourballMatchupIds([]);
          setIsLoading(false);
        }
      }, (error) => {
        if (!isMounted.current || !authStateRef.current) return;
        console.error('Error in tournament settings listener:', error);
        setTournamentSettings(null);
        setGames([]);
        setUserFourballMatchupIds([]);
        setIsLoading(false);
      });
    };

    listenersRef.current.auth = auth.onAuthStateChanged((user) => {
      if (!isMounted.current) return;
      const newAuthState = !!user;
      if (authStateRef.current !== newAuthState || !listenersRef.current.tournament) {
        authStateRef.current = newAuthState;
        cleanupListeners();
        if (user) {
          setTimeout(() => { if (isMounted.current) setupListeners(); }, 100);
        } else {
          setTournamentSettings(null);
          setGames([]);
          setUserFourballMatchupIds([]);
          setIsLoading(false);
        }
      }
    });

    if (auth.currentUser) {
      authStateRef.current = true;
       setTimeout(() => { if (isMounted.current) setupListeners(); }, 100);
    }

    return () => {
      cleanupListeners();
      if (listenersRef.current.auth) {
        listenersRef.current.auth();
        listenersRef.current.auth = undefined;
      }
      authStateRef.current = false;
    };
  }, [tournamentId, currentUserId, linkedPlayerId, isAdmin]);

  const handleGameStatusChange = useCallback(async (game: Game, newStatus: GameStatus) => {
    console.log('=== HANDLE GAME STATUS CHANGE START ===');
    console.log('Tournament ID:', tournamentId);
    console.log('Game ID:', game.id);
    console.log('Current game status:', game.status);
    console.log('New status:', newStatus);
    console.log('Tournament is complete:', tournamentSettings?.isComplete);
    
    if (!tournamentId) return;
    
    // Check if tournament is complete and prevent status changes
    if (tournamentSettings?.isComplete) {
      throw new Error('Cannot change game status: Tournament is marked as complete. Please mark the tournament as incomplete first to make changes.');
    }
    
    const gameRef = doc(db, 'tournaments', tournamentId, 'games', game.id);
    const updateData: any = { 
      status: newStatus,
      updatedAt: serverTimestamp()
    };

    if (newStatus === 'in_progress' && !game.isStarted) {
      updateData.isStarted = true;
      updateData.startTime = serverTimestamp(); 
    } else if (newStatus === 'in_progress' && game.isComplete) {
      // If changing from complete to in_progress, set isComplete to false
      updateData.isComplete = false;
    } else if (newStatus === 'complete' && !game.isComplete) {
      updateData.isComplete = true;
      updateData.endTime = serverTimestamp();
      if (!game.isStarted) {
        updateData.isStarted = true;
        updateData.startTime = game.startTime || serverTimestamp();
      }
    } else if (newStatus === 'not_started') {
        updateData.isStarted = false;
        updateData.isComplete = false;
    }
    
    console.log('Update data being sent to Firestore:', updateData);
    
    try {
      console.log('Updating Firestore document...');
      await updateDoc(gameRef, updateData);
      console.log('Firestore document updated successfully');
      
      const gamesCollectionRef = collection(db, 'tournaments', tournamentId, 'games');
      await getDocs(gamesCollectionRef);
      console.log('Re-fetched games collection');
      
      console.log('Updating tournament scores...');
      await updateTournamentScores(tournamentId);
      console.log('Tournament scores updated successfully');
      
      console.log('=== HANDLE GAME STATUS CHANGE COMPLETED ===');

    } catch (error) {
      console.error('=== ERROR IN HANDLE GAME STATUS CHANGE ===', error);
      console.error('Error updating game status or tournament scores:', error);
      throw error; // Re-throw to allow UI to handle the error
    }
  }, [tournamentId, tournamentSettings]);

  return useMemo(() => ({
    games,
    handleGameStatusChange,
    tournamentSettings,
    isLoading,
    userFourballMatchupIds
  }), [games, handleGameStatusChange, tournamentSettings, isLoading, userFourballMatchupIds]);
}