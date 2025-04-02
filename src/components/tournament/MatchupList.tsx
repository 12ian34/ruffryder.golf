import type { Game } from '../../types/game';
import GameCard from '../GameCard';

interface MatchupListProps {
  matchups: Game[];
  isAdmin: boolean;
  onDelete: (gameId: string) => void;
  useHandicaps: boolean;
}

export default function MatchupList({ matchups, isAdmin, onDelete, useHandicaps }: MatchupListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium dark:text-white">Current Matchups</h3>
      <div className="space-y-4">
        {matchups.map((game) => (
          <div key={game.id} className="relative">
            <GameCard
              game={game}
              isAdmin={isAdmin}
              showControls={false}
              useHandicaps={useHandicaps}
            />
            {isAdmin && (
              <button
                onClick={() => onDelete(game.id)}
                className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
                title="Delete Matchup"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {matchups.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No matchups created yet
          </div>
        )}
      </div>
    </div>
  );
}