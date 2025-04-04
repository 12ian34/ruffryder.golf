import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import PlayerDisplay from './PlayerDisplay';
import type { Game } from '../../types/game';

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
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchPlayerData();
  }, [game.usaPlayerId, game.europePlayerId]);

  return (
    <div className="flex justify-between items-center gap-4">
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
      />

      <div className="text-gray-400 dark:text-gray-500">vs</div>

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
      />
    </div>
  );
}