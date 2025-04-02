import { useState } from 'react';
import type { Game } from '../../types/game';
import GameCard from '../GameCard';
import ScoreEntry from '../ScoreEntry';
import GameCompletionModal from '../GameCompletionModal';

interface GameListProps {
  games: Game[];
  isAdmin: boolean;
  onGameStatusChange: (game: Game, status: 'not_started' | 'in_progress' | 'complete') => Promise<void>;
  isOnline: boolean;
}

export default function GameList({ games, isAdmin, onGameStatusChange, isOnline }: GameListProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameToComplete, setGameToComplete] = useState<Game | null>(null);

  const handleGameStatusChange = async (game: Game, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (newStatus === 'complete') {
      setGameToComplete(game);
    } else {
      await onGameStatusChange(game, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isAdmin={isAdmin}
            onStatusChange={handleGameStatusChange}
            onEnterScores={() => setSelectedGame(game)}
            showControls={true}
          />
        ))}

        {games.length === 0 && (
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