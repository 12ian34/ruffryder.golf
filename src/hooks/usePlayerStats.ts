import { useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import type { Player } from '../types/player';
import type { User } from '../types/user';

export function usePlayerStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'team' | 'averageScore' | number>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'USA' | 'EUROPE'>('ALL');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data to get linked player ID
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setLinkedPlayerId(userData.linkedPlayerId);
          }
        }

        // Fetch players
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        setPlayers(playersData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedPlayers = [...players]
    .filter(player => teamFilter === 'ALL' || player.team === teamFilter)
    .sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'team':
          return direction * a.team.localeCompare(b.team);
        case 'averageScore':
          return direction * (a.averageScore - b.averageScore);
        default:
          const aScore = a.historicalScores.find(s => s.year === sortField)?.score ?? 999;
          const bScore = b.historicalScores.find(s => s.year === sortField)?.score ?? 999;
          return direction * (aScore - bScore);
      }
    });

  const years = Array.from(
    new Set(
      players.flatMap(p => p.historicalScores.map(s => s.year))
    )
  ).sort((a, b) => b - a);

  return {
    players: filteredAndSortedPlayers,
    isLoading,
    error,
    sortField,
    sortDirection,
    toggleSort,
    years,
    linkedPlayerId,
    teamFilter,
    setTeamFilter
  };
}