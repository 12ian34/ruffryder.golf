import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import PlayerDisplay from './PlayerDisplay';
import type { Game } from '../../types/game';
import type { User } from '../../types/user';

interface PlayerPairProps {
  game: Game;
  currentUserId: string | null;
  compact?: boolean;
}

export default function PlayerPair({ game, currentUserId, compact }: PlayerPairProps) {
  const [usaHandicap, setUsaHandicap] = useState<number>(0);
  const [europeHandicap, setEuropeHandicap] = useState<number>(0);
  const [usaCustomEmoji, setUsaCustomEmoji] = useState<string | undefined>();
  const [europeCustomEmoji, setEuropeCustomEmoji] = useState<string | undefined>();
  const [usaLinkedUser, setUsaLinkedUser] = useState<User | null>(null);
  const [europeLinkedUser, setEuropeLinkedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const [usaPlayerDoc, europePlayerDoc] = await Promise.all([
          getDoc(doc(db, 'players', game.usaPlayerId)),
          getDoc(doc(db, 'players', game.europePlayerId))
        ]);

        if (usaPlayerDoc.exists()) {
          const usaData = usaPlayerDoc.data();
          setUsaHandicap(usaData.averageScore);
          setUsaCustomEmoji(usaData.customEmoji);
        }

        if (europePlayerDoc.exists()) {
          const europeData = europePlayerDoc.data();
          setEuropeHandicap(europeData.averageScore);
          setEuropeCustomEmoji(europeData.customEmoji);
        }

        // Fetch linked users
        const usersQuery = query(
          collection(db, 'users'),
          where('linkedPlayerId', 'in', [game.usaPlayerId, game.europePlayerId])
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() } as User;
          if (userData.linkedPlayerId === game.usaPlayerId) {
            setUsaLinkedUser(userData);
          } else if (userData.linkedPlayerId === game.europePlayerId) {
            setEuropeLinkedUser(userData);
          }
        });
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchPlayerData();
  }, [game.usaPlayerId, game.europePlayerId]);

  return (
    <div className="flex justify-between items-center">
      <PlayerDisplay
        player={{
          id: game.usaPlayerId,
          name: game.usaPlayerName,
          team: 'USA',
          historicalScores: [],
          averageScore: usaHandicap,
          customEmoji: usaCustomEmoji
        }}
        team="USA"
        showAverage={true}
        compact={compact}
        isCurrentUser={currentUserId === game.usaPlayerId}
        linkedUserName={usaLinkedUser?.name}
      />

      <div className="text-gray-200 dark:text-gray-200 bg-gradient-to-r from-usa-900/30 via-transparent to-europe-900/30 px-3 py-1 rounded-full text-sm font-semibold mx-2 sm:mx-4 shadow-inner">vs</div>

      <PlayerDisplay
        player={{
          id: game.europePlayerId,
          name: game.europePlayerName,
          team: 'EUROPE',
          historicalScores: [],
          averageScore: europeHandicap,
          customEmoji: europeCustomEmoji
        }}
        team="EUROPE"
        showAverage={true}
        compact={compact}
        isCurrentUser={currentUserId === game.europePlayerId}
        linkedUserName={europeLinkedUser?.name}
      />
    </div>
  );
}