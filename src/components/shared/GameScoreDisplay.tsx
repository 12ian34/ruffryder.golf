import type { Game } from '../../types/game';

interface GameScoreDisplayProps {
  game: Game;
  compact?: boolean;
  useHandicaps: boolean;
}

export default function GameScoreDisplay({ game, compact = false, useHandicaps }: GameScoreDisplayProps) {
  // Log useHandicaps value
  console.log('GameScoreDisplay - useHandicaps:', { gameId: game.id, useHandicaps });

  const isComplete = game.isComplete;
  const isInProgress = !isComplete && game.isStarted;

  const getStrokePlayColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-500';
    
    const usaScore = useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA;
    const europeScore = useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE;
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
    const usaScore = useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA;
    const europeScore = useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE;
    const usaWinning = usaScore > europeScore;
    const europeWinning = europeScore > usaScore;
    const isTied = usaScore === europeScore && 
                  (usaScore > 0 || europeScore > 0);

    if (isUSA) {
      return usaWinning || isTied ? 'text-green-500' : 'text-gray-500';
    } else {
      return europeWinning || isTied ? 'text-green-500' : 'text-gray-500';
    }
  };

  const status = {
    label: isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started',
    bgColor: isComplete ? 'bg-green-100 dark:bg-green-900' : isInProgress ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-800',
    textColor: isComplete ? 'text-green-800 dark:text-green-200' : isInProgress ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-800 dark:text-gray-200',
    icon: isComplete ? '✓' : isInProgress ? '⏳' : '⏸'
  };

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {/* Game Status - Moved to top for more prominence */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${status.bgColor} ${status.textColor} font-medium text-sm`}>
          <span className="mr-1">{status.icon}</span>
          {status.label}
        </div>
      </div>

      {/* Show scores if game has started or is complete */}
      {(game.isStarted || game.isComplete) && (
        <>
          {/* Stroke Play Score */}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Stroke Play
            </div>
            <div className="flex justify-center items-center space-x-2">
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getStrokePlayColor(true)}`}>
                  {useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA}
                </span>
                {useHandicaps && game.higherHandicapTeam === 'USA' && (
                  <span className="text-xs text-gray-400">({game.strokePlayScore.USA})</span>
                )}
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getStrokePlayColor(false)}`}>
                  {useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE}
                </span>
                {useHandicaps && game.higherHandicapTeam === 'EUROPE' && (
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
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getMatchPlayColor(true)}`}>
                  {useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA}
                </span>
                {useHandicaps && game.higherHandicapTeam !== 'USA' && (
                  <span className="text-xs text-gray-400">({game.matchPlayScore.USA})</span>
                )}
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getMatchPlayColor(false)}`}>
                  {useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE}
                </span>
                {useHandicaps && game.higherHandicapTeam !== 'EUROPE' && (
                  <span className="text-xs text-gray-400">({game.matchPlayScore.EUROPE})</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}