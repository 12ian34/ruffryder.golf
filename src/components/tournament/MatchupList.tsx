import type { Game } from '../../types/game';
import type { Player } from '../../types/player';
import GameCard from '../GameCard';

interface MatchupListProps {
  matchups: Game[];
  players: Player[];
}

export default function MatchupList({ matchups, players }: MatchupListProps) {
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