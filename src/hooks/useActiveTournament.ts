import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Tournament } from '../types/tournament';

export function useActiveTournament(userId: string | undefined) {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !auth.currentUser) {
      setActiveTournament(null);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupListener = () => {
      const tournamentsRef = collection(db, 'tournaments');
      const q = query(tournamentsRef, where('isActive', '==', true));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const tournamentDoc = snapshot.docs[0];
          const tournamentData = tournamentDoc.data();
          setActiveTournament({ 
            id: tournamentDoc.id, 
            ...tournamentData,
            handicapStrokes: tournamentData.handicapStrokes || 0,
            higherHandicapTeam: tournamentData.higherHandicapTeam || 'USA',
            isComplete: tournamentData.isComplete || false
          } as Tournament);
        } else {
          setActiveTournament(null);
        }
        setIsLoading(false);
      }, (error) => {
        console.error('Error in tournament listener:', error);
        setActiveTournament(null);
        setIsLoading(false);
      });
    };

    // Set up auth state change listener
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      
      if (user) {
        setupListener();
      } else {
        setActiveTournament(null);
        setIsLoading(false);
      }
    });

    // Initial setup if already authenticated
    if (auth.currentUser) {
      setupListener();
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [userId]);

  return { activeTournament, isLoading };
} 