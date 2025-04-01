import { useState, useEffect } from 'react';
import type { Game } from '../../types/game';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface HandicapDisplayProps {
  game: Game;
  compact?: boolean;
}

export default function HandicapDisplay({ game, compact = false }: HandicapDisplayProps) {
  const [useHandicaps, setUseHandicaps] = useState(false);

  useEffect(() => {
    const fetchTournamentSettings = async () => {
      if (!game?.tournamentId) {
        return;
      }

      try {
        const tournamentRef = doc(db, 'tournaments', game.tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);
        if (tournamentDoc.exists()) {
          setUseHandicaps(tournamentDoc.data().useHandicaps);
        }
      } catch (error) {
        console.error('Error fetching tournament settings:', error);
      }
    };

    fetchTournamentSettings();
  }, [game?.tournamentId, game?.id]);

  if (!game?.tournamentId || !useHandicaps || !game.handicapStrokes || !game.higherHandicapTeam) {
    return null;
  }

  return (
    <div className={`text-center text-sm text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : ''}`}>
      {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
    </div>
  );
}