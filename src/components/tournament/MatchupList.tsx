import type { Game } from '../../types/game';
import GameCard from '../GameCard';

interface MatchupListProps {
  matchups: Game[];
  isOnline: boolean;
}

export default function MatchupList({ matchups, isOnline }: MatchupListProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4 dark:text-white">Current Matchups</h3>
      <div className="space-y-4">
        {matchups.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            compact={true}
            showControls={false}
            isOnline={isOnline}
          />
        ))}
        {matchups.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No matchups created yet
          </div>
        )}
      </div>
    </div>  
  );
}