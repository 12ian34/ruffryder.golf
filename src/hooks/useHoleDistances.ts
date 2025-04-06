import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Cache to avoid multiple requests
let cachedDistances: number[] | null = null;

// Reset function for testing
export function __resetCacheForTesting() {
  cachedDistances = null;
}

export function useHoleDistances() {
  const [distances, setDistances] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(cachedDistances === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDistances() {
      // Skip fetching if we already have cached data
      if (cachedDistances !== null) {
        setDistances(cachedDistances);
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'config', 'holeDistances');
        const docSnap = await getDoc(docRef);
        
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const indices = data?.indices || [];
          cachedDistances = indices;
          setDistances(indices);
        } else {
          // If no document exists, use default empty array
          cachedDistances = [];
          setDistances([]);
        }
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching hole distances:', err);
        setError(err.message || 'Failed to load hole distances');
        setDistances([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDistances();

    return () => {
      isMounted = false;
    };
  }, []);

  // Use memoized return value to prevent unnecessary rerenders
  return useMemo(() => ({
    distances,
    isLoading,
    error
  }), [distances, isLoading, error]);
} 