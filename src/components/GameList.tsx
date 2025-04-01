import { useState } from 'react';
import type { Game } from '../types/game';
import GameCard from './GameCard';
import ScoreEntry from './ScoreEntry';
import GameCompletionModal from './GameCompletionModal';
import StatusFilter from './filters/StatusFilter';

interface GameListProps {
  games: Game[];
  isAdmin: boolean;
  onGameStatusChange: (game: Game, status: 'not_started' | 'in_progress' | 'complete') => Promise<void>;
  isOnline: boolean;
}

export default function GameList({ games, isAdmin, onGameStatusChange, isOnline }: GameListProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameToComplete, setGameToComplete] = useState<Game | null>(null);
  const [activeStatus, setActiveStatus] = useState<'all' | 'complete' | 'in_progress' | 'not_started'>('all');

  const handleGameStatusChange = async (game: Game, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (newStatus === 'complete') {
      setGameToComplete(game);
    } else {
      await onGameStatusChange(game, newStatus);
    }
  };

  const filteredGames = games.filter(game => {
    if (activeStatus === 'all') return true;
    if (activeStatus === 'complete') return game.isComplete;
    if (activeStatus === 'in_progress') return !game.isComplete && game.isStarted;
    return !game.isComplete && !game.isStarted;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold dark:text-white">Your Games</h2>
          {!isOnline && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              Offline Mode
            </div>
          )}
        </div>
        <StatusFilter
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />
      </div>

      <div className="grid gap-4 sm:gap-6">
        {filteredGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isAdmin={isAdmin}
            onStatusChange={handleGameStatusChange}
            onEnterScores={() => setSelectedGame(game)}
            showControls={true}
            isOnline={isOnline}
          />
        ))}

        {filteredGames.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No games found
          </div>
        )}
      </div>

      {selectedGame && (
        <ScoreEntry
          gameId={selectedGame.id}
          tournamentId={selectedGame.tournamentId}
          onClose={() => setSelectedGame(null)}
          isOnline={isOnline}
        />
      )}

      {gameToComplete && (
        <GameCompletionModal
          game={gameToComplete}
          tournamentId={gameToComplete.tournamentId}
          onClose={() => setGameToComplete(null)}
          isOnline={isOnline}
        />
      )}
    </div>
  );
}