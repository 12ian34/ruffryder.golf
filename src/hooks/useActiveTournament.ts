import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';

export function useActiveTournament(userId: string | undefined) {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setActiveTournament(null);
      setIsLoading(false);
      return;
    }

    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tournamentDoc = snapshot.docs[0];
        const tournamentData = tournamentDoc.data();
        setActiveTournament({ 
          id: tournamentDoc.id, 
          ...tournamentData,
          handicapStrokes: tournamentData.handicapStrokes || 0,
          higherHandicapTeam: tournamentData.higherHandicapTeam || 'USA'
        } as Tournament);
      } else {
        setActiveTournament(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { activeTournament, isLoading };
} 