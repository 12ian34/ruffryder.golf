import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase'; // Assuming auth is not strictly needed for just reading public tournament data
import type { Tournament } from '../types/tournament';

export function useAllActiveTournaments() {
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('isActive', '==', true));

    // Initial fetch using getDocs for immediate data
    const fetchInitialData = async () => {
      try {
        const querySnapshot = await getDocs(q);
        const tournamentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure default values for potentially missing fields if necessary
          // For example, if these were made optional in the DB but not in the type:
          // handicapStrokes: doc.data().handicapStrokes || 0, 
          // higherHandicapTeam: doc.data().higherHandicapTeam || 'USA' 
          isComplete: doc.data().isComplete || false
        })) as Tournament[];
        setActiveTournaments(tournamentsData);
      } catch (err: any) {
        console.error('Error fetching active tournaments:', err);
        setError(err.message);
      } finally {
        setIsLoading(false); // Set loading to false after initial fetch attempt
      }
    };

    fetchInitialData();

    // Set up real-time listener with onSnapshot
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isComplete: doc.data().isComplete || false
      })) as Tournament[];
      setActiveTournaments(tournamentsData);
      // setIsLoading(false); // Already handled by initial fetch
      setError(null); // Clear any previous error on successful update
    }, (err: any) => {
      console.error('Error in active tournaments listener:', err);
      setError(err.message);
      // setIsLoading(false); // Already handled
    });

    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array to run once on mount

  return { activeTournaments, isLoading, error };
} 