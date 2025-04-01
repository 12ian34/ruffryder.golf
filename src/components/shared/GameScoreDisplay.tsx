import type { Game } from '../../types/game';

interface GameScoreDisplayProps {
  game: Game;
  compact?: boolean;
}

export default function GameScoreDisplay({ game, compact = false }: GameScoreDisplayProps) {
  const isComplete = game.isComplete;
  const isInProgress = !isComplete && game.isStarted;

  const getAdjustedScore = (team: 'USA' | 'EUROPE') => {
    if (team === game.higherHandicapTeam) {
      return game.strokePlayScore[team];
    }
    return game.strokePlayScore[team] + game.handicapStrokes;
  };

  const getStrokePlayColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-500';
    
    const usaScore = getAdjustedScore('USA');
    const europeScore = getAdjustedScore('EUROPE');
    const usaWinning = usaScore < europeScore;
    const europeWinning = europeScore < usaScore;
    const isTied = usaScore === europeScore && 
                  (usaScore > 0 || europeScore > 0);

    if (isUSA) {
      return usaWinning || isTied ? 'text-green-500' : 'text-gray-500';
    } else {
      return europeWinning || isTied ? 'text-green-500' : 'text-gray-500';
    }
  };

  const getMatchPlayColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-500';
    
    const usaWinning = game.matchPlayScore.USA > game.matchPlayScore.EUROPE;
    const europeWinning = game.matchPlayScore.EUROPE > game.matchPlayScore.USA;
    const isTied = game.matchPlayScore.USA === game.matchPlayScore.EUROPE && 
                  (game.matchPlayScore.USA > 0 || game.matchPlayScore.EUROPE > 0);

    if (isUSA) {
      return usaWinning || isTied ? 'text-green-500' : 'text-gray-500';
    } else {
      return europeWinning || isTied ? 'text-green-500' : 'text-gray-500';
    }
  };

  const getStatusDetails = () => {
    if (isComplete) {
      return {
        label: 'COMPLETE',
        bgColor: 'bg-green-100 dark:bg-green-900',
        textColor: 'text-green-800 dark:text-green-200',
        icon: '✓'
      };
    }
    if (isInProgress) {
      return {
        label: 'IN PROGRESS',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        icon: '⚡'
      };
    }
    return {
      label: 'NOT STARTED',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      textColor: 'text-gray-800 dark:text-gray-300',
      icon: '⏳'
    };
  };

  const status = getStatusDetails();
  const usaAdjustedScore = getAdjustedScore('USA');
  const europeAdjustedScore = getAdjustedScore('EUROPE');

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {/* Game Status - Moved to top for more prominence */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${status.bgColor} ${status.textColor} font-medium text-sm`}>
          <span className="mr-1">{status.icon}</span>
          {status.label}
        </div>
      </div>

      {/* Stroke Play Score */}
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Stroke Play
        </div>
        <div className="flex justify-center items-center space-x-2">
          <div className="flex flex-col items-center">
            <span className={`font-medium text-lg ${getStrokePlayColor(true)}`}>
              {usaAdjustedScore}
            </span>
            {game.higherHandicapTeam !== 'USA' && (
              <span className="text-xs text-gray-400">({game.strokePlayScore.USA})</span>
            )}
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex flex-col items-center">
            <span className={`font-medium text-lg ${getStrokePlayColor(false)}`}>
              {europeAdjustedScore}
            </span>
            {game.higherHandicapTeam !== 'EUROPE' && (
              <span className="text-xs text-gray-400">({game.strokePlayScore.EUROPE})</span>
            )}
          </div>
        </div>
      </div>

      {/* Match Play Score */}
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Match Play
        </div>
        <div className="flex justify-center items-center space-x-2">
          <span className={`font-medium ${getMatchPlayColor(true)}`}>
            {game.matchPlayScore.USA}
          </span>
          <span className="text-gray-400">-</span>
          <span className={`font-medium ${getMatchPlayColor(false)}`}>
            {game.matchPlayScore.EUROPE}
          </span>
        </div>
      </div>
    </div>
  );
}