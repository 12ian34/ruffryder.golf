import { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Player } from '../types/player';

type SortField = 'name' | 'team' | 'averageScore' | 'tier' | number;
type SortDirection = 'asc' | 'desc';

export function usePlayerData(tournamentId: string | undefined) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isMounted = true;
    
    const fetchPlayers = async () => {
      try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        setPlayers(playersData);
        
        if (!isMounted) return;
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPlayers();
    
    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const handleSavePlayer = async (playerId: string | null, updates: Partial<Player>) => {
    try {
      if (playerId) {
        // Update existing player
        await updateDoc(doc(db, 'players', playerId), updates);
        setPlayers(players.map(p => 
          p.id === playerId ? { ...p, ...updates } : p
        ));
      } else {
        // Create new player
        const docRef = await addDoc(collection(db, 'players'), {
          ...updates,
          averageScore: 0,
          historicalScores: []
        });
        const newPlayer = {
          id: docRef.id,
          ...updates,
          averageScore: 0,
          historicalScores: []
        } as Player;
        setPlayers([...players, newPlayer]);
      }
      setSuccessMessage(`Player ${playerId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'players', playerId));
      setPlayers(players.filter(p => p.id !== playerId));
      setSuccessMessage('Player deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'team':
        return direction * a.team.localeCompare(b.team);
      case 'tier':
        const aTier = a.tier ?? 999;
        const bTier = b.tier ?? 999;
        return direction * (aTier - bTier);
      case 'averageScore':
        return direction * ((a.averageScore ?? 0) - (b.averageScore ?? 0));
      default:
        const aScore = a.historicalScores.find(s => s.year === sortField)?.score ?? 999;
        const bScore = b.historicalScores.find(s => s.year === sortField)?.score ?? 999;
        return direction * (aScore - bScore);
    }
  });

  // Use memoized return value to prevent unnecessary rerenders
  return useMemo(() => ({
    players: sortedPlayers,
    isLoading,
    error,
    successMessage,
    handleSavePlayer,
    handleDeletePlayer,
    sortField,
    sortDirection,
    toggleSort
  }), [sortedPlayers, isLoading, error, successMessage, handleSavePlayer, handleDeletePlayer, sortField, sortDirection, toggleSort]);
}