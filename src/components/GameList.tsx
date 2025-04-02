import { useState } from 'react';
import { Game, GameStatus } from '../types/game';
import GameCard from './GameCard';
import ScoreEntry from './ScoreEntry';
import GameCompletionModal from './GameCompletionModal';
import StatusFilter from './filters/StatusFilter';

interface GameListProps {
  games: Game[];
  isAdmin: boolean;
  onGameStatusChange: (game: Game, newStatus: GameStatus) => Promise<void>;
  isOnline: boolean;
  useHandicaps: boolean;
}

export default function GameList({ games, isAdmin, onGameStatusChange, isOnline, useHandicaps }: GameListProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameToComplete, setGameToComplete] = useState<Game | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [activeStatus, setActiveStatus] = useState<GameStatus>('in_progress');

  const filteredGames = games.filter(game => {
    if (activeStatus === 'all') return true;
    if (activeStatus === 'not_started') return !game.isStarted;
    if (activeStatus === 'in_progress') return game.isStarted && !game.isComplete;
    return game.isComplete;
  });

  const handleGameStatusChange = async (game: Game, newStatus: GameStatus) => {
    if (newStatus === 'complete') {
      setGameToComplete(game);
    } else {
      await onGameStatusChange(game, newStatus);
    }
  };

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
            key={`${game.id}-${modalKey}`}
            game={game}
            isAdmin={isAdmin}
            onStatusChange={handleGameStatusChange}
            onEnterScores={() => setSelectedGame(game)}
            showControls={true}
            useHandicaps={useHandicaps}
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
          onClose={() => {
            setSelectedGame(null);
            setModalKey(prev => prev + 1);
          }}
          onSave={() => {
            setSelectedGame(null);
            setModalKey(prev => prev + 1);
          }}
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