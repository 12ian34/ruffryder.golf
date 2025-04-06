import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Cache to avoid multiple requests
let cachedDistances: number[] | null = null;

export function useHoleDistances() {
  const [distances, setDistances] = useState<number[]>(cachedDistances || []);
  const [isLoading, setIsLoading] = useState(cachedDistances === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have cached distances, return them
    if (cachedDistances !== null) {
      setDistances(cachedDistances);
      setIsLoading(false);
      return;
    }

    const fetchHoleDistances = async () => {
      try {
        // Fetch distances from the holeDistances document in the config collection
        const holeDistancesDoc = await getDoc(doc(db, 'config', 'holeDistances'));
        
        if (holeDistancesDoc.exists()) {
          // Extract the indices array directly
          const distancesArray = holeDistancesDoc.data().indices || [];
          
          // Cache the result
          cachedDistances = distancesArray;
          
          setDistances(distancesArray);
        } else {
          console.log('No hole distances document found');
          // Cache an empty array to avoid trying again
          cachedDistances = [];
          setDistances([]);
        }
      } catch (err: any) {
        console.error('Error fetching hole distances:', err);
        setError(err.message || 'Failed to load hole distances');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoleDistances();
  }, []);

  return { distances, isLoading, error };
} 