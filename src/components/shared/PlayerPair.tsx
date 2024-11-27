import PlayerDisplay from './PlayerDisplay';
import type { Game } from '../../types/game';

interface PlayerPairProps {
  game: Game;
  currentUserId: string | null;
  compact?: boolean;
}

export default function PlayerPair({ game, currentUserId, compact }: PlayerPairProps) {
  return (
    <div className="flex justify-between items-center gap-4">
      <PlayerDisplay
        player={{
          id: game.usaPlayerId,
          name: game.usaPlayerName,
          team: 'USA',
          historicalScores: [],
          averageScore: 0
        }}
        team="USA"
        showAverage={false}
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
          averageScore: 0
        }}
        team="EUROPE"
        showAverage={false}
        compact={compact}
        isCurrentUser={currentUserId === game.europePlayerId}
      />
    </div>
  );
}