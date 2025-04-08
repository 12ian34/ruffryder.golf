import type { Game } from '../../types/game';
import { ScoreTiles } from './GameScoreUtils';

interface GameScoreDisplayProps {
  game: Game;
  compact?: boolean;
  useHandicaps: boolean;
}

export default function GameScoreDisplay({ game, compact = false, useHandicaps }: GameScoreDisplayProps) {
  const isComplete = game.isComplete;
  const isInProgress = !isComplete && game.isStarted;

  const status = {
    label: isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started',
    bgColor: isComplete ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800' : 
             isInProgress ? 'bg-gradient-to-r from-europe-600 to-europe-700 dark:from-europe-600 dark:to-europe-800' : 
             'bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-700 dark:to-gray-900',
    textColor: 'text-white',
    icon: isComplete ? '✓' : isInProgress ? '⏳' : '⏸'
  };

  return (
    <div className={`relative ${compact ? "space-y-2" : "space-y-3"}`} data-testid="game-score-display">
      {/* Show scores if game has started or is complete */}
      {(game.isStarted || game.isComplete) ? (
        <div>
          {/* Game Status - Within the component */}
          <div className="flex justify-center mb-3">
            <div 
              className={`
                inline-flex items-center px-3 py-1
                text-xs font-medium
                ${status.bgColor} ${status.textColor}
                rounded-md shadow-md border border-white/10
              `} 
              data-testid="game-status"
            >
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </div>
          </div>
          
          <ScoreTiles game={game} useHandicaps={useHandicaps} className="space" />
        </div>
      ) : (
        <div>
          {/* Game Status when not started */}
          <div className="flex justify-center my-2">
            <div 
              className={`
                inline-flex items-center px-3 py-1
                text-xs font-medium
                ${status.bgColor} ${status.textColor}
                rounded-md shadow-md
              `} 
              data-testid="game-status"
            >
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}