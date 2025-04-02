import GameList from './game/GameList';
import { useGameData } from '../hooks/useGameData';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';

interface UserData {
  linkedPlayerId?: string | null;
  isAdmin?: boolean;
  isOnline?: boolean;
}

export default function GameManagement() {
  const { user, loading: authLoading } = useAuth();
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [useHandicaps, setUseHandicaps] = useState(false);

  const { games, handleGameStatusChange } = useGameData(
    user?.uid,
    linkedPlayerId,
    isAdmin
  );

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          setLinkedPlayerId(userData.linkedPlayerId || null);
          setIsAdmin(userData.isAdmin || false);
          setIsOnline(userData.isOnline || false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user?.uid]);

  useEffect(() => {
    const fetchTournamentSettings = async () => {
      try {
        // Query for active tournament
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentsSnapshot = await getDocs(tournamentsRef);
        const activeTournament = tournamentsSnapshot.docs
          .find(doc => doc.data().isActive);

        if (activeTournament) {
          setUseHandicaps(activeTournament.data().useHandicaps);
        }
      } catch (error) {
        console.error('Error fetching tournament settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentSettings();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please log in to view your games
      </div>
    );
  }

  return (
    <GameList
      games={games}
      isAdmin={isAdmin}
      onGameStatusChange={handleGameStatusChange}
      isOnline={isOnline}
      useHandicaps={useHandicaps}
    />
  );
}