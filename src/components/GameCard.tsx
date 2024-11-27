import type { Game } from '../types/game';
import { calculateGamePoints } from '../utils/gamePoints';
import GameScoreDisplay from './shared/GameScoreDisplay';
import PlayerPair from './shared/PlayerPair';
import HandicapDisplay from './shared/HandicapDisplay';

interface GameCardProps {
  game: Game;
  isAdmin?: boolean;
  onStatusChange?: (game: Game, status: 'not_started' | 'in_progress' | 'complete') => void;
  onEnterScores?: () => void;
  showControls?: boolean;
  compact?: boolean;
}

export default function GameCard({ 
  game, 
  isAdmin, 
  onStatusChange, 
  onEnterScores,
  showControls = false,
  compact = false
}: GameCardProps) {
  const points = calculateGamePoints(game);

  // Get current user ID from auth context
  const currentUserId = isAdmin ? localStorage.getItem('userId') : null;
  const isAdminPlayer = currentUserId && (
    game.usaPlayerId === currentUserId || 
    game.europePlayerId === currentUserId
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} ${
      isAdminPlayer ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
    }`}>
      <div className="flex flex-col gap-4">
        {/* Players */}
        <PlayerPair
          game={game}
          currentUserId={currentUserId}
          compact={compact}
        />

        {/* Game Status & Scores */}
        <div className="text-center">
          <GameScoreDisplay game={game} compact={compact} />
          
          {/* Points Display */}
          <div className="mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Points {!game.isComplete && '(Projected)'}
            </div>
            <div className="flex justify-center items-center space-x-2">
              <span className={`font-medium ${
                points.USA > points.EUROPE ? 'text-green-500' : 'text-gray-500'
              }`}>
                {points.USA}
              </span>
              <span className="text-gray-400">-</span>
              <span className={`font-medium ${
                points.EUROPE > points.USA ? 'text-green-500' : 'text-gray-500'
              }`}>
                {points.EUROPE}
              </span>
            </div>
          </div>

          {/* Controls */}
          {showControls && onEnterScores && (
            <div className="mt-4 space-y-2">
              <button
                onClick={onEnterScores}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {!game.isStarted ? 'Start Game' : 'Enter Scores'}
              </button>

              {isAdmin && onStatusChange && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {game.isComplete ? (
                    <button
                      onClick={() => onStatusChange(game, 'in_progress')}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                    >
                      Mark as In Progress
                    </button>
                  ) : game.isStarted ? (
                    <>
                      <button
                        onClick={() => onStatusChange(game, 'not_started')}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                      >
                        Mark as Not Started
                      </button>
                      <button
                        onClick={() => onStatusChange(game, 'complete')}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                      >
                        Mark as Complete
                      </button>
                    </>
                  ) : game.strokePlayScore.USA > 0 && (
                    <button
                      onClick={() => onStatusChange(game, 'in_progress')}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                    >
                      Mark as In Progress
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <HandicapDisplay game={game} compact={compact} />
    </div>
  );
}