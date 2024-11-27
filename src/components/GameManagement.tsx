import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import type { User } from '../types/user';
import GameList from './GameList';
import { useGameData } from '../hooks/useGameData';

interface GameManagementProps {
  userId: string | undefined;
}

export default function GameManagement({ userId }: GameManagementProps) {
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { 
    games,
    isLoading,
    error,
    handleGameStatusChange,
    activeTournamentId
  } = useGameData(userId, linkedPlayerId, isAdmin);

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setLinkedPlayerId(userData.linkedPlayerId || null);
          setIsAdmin(userData.isAdmin || false);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!activeTournamentId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No active tournament found
      </div>
    );
  }

  return (
    <GameList
      games={games}
      isAdmin={isAdmin}
      onGameStatusChange={handleGameStatusChange}
    />
  );
}