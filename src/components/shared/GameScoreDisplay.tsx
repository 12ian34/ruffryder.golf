import type { Game } from '../../types/game';

interface GameScoreDisplayProps {
  game: Game;
  compact?: boolean;
  useHandicaps: boolean;
}

export default function GameScoreDisplay({ game, compact = false, useHandicaps }: GameScoreDisplayProps) {

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
    bgColor: isComplete ? 'bg-green-500 dark:bg-green-400' : isInProgress ? 'bg-amber-500 dark:bg-amber-400' : 'bg-gray-800 dark:bg-gray-700',
    textColor: isComplete ? 'text-white' : isInProgress ? 'text-black' : 'text-white',
    icon: isComplete ? '✓' : isInProgress ? '⏳' : '⏸'
  };

  return (
    <div className={`relative ${compact ? "space-y-2" : "space-y-3"}`} data-testid="game-score-display">
      {/* Show scores if game has started or is complete */}
      {(game.isStarted || game.isComplete) ? (
        <div>
          {/* Game Status - Within the component */}
          <div className="flex justify-center mb-2">
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
          
          {/* Stroke Play Score */}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1" data-testid="stroke-play-label">
              Stroke Play
            </div>
            <div className="flex justify-center items-center space-x-2">
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getStrokePlayColor(true)}`} data-testid="stroke-play-usa">
                  {useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA}
                </span>
                {useHandicaps && game.higherHandicapTeam === 'USA' && (
                  <span className="text-xs text-gray-400" data-testid="stroke-play-usa-original">({game.strokePlayScore.USA})</span>
                )}
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getStrokePlayColor(false)}`} data-testid="stroke-play-europe">
                  {useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE}
                </span>
                {useHandicaps && game.higherHandicapTeam === 'EUROPE' && (
                  <span className="text-xs text-gray-400" data-testid="stroke-play-europe-original">({game.strokePlayScore.EUROPE})</span>
                )}
              </div>
            </div>
          </div>

          {/* Match Play Score */}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1" data-testid="match-play-label">
              Match Play
            </div>
            <div className="flex justify-center items-center space-x-2">
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getMatchPlayColor(true)}`} data-testid="match-play-usa">
                  {useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA}
                </span>
                {useHandicaps && game.higherHandicapTeam !== 'USA' && (
                  <span className="text-xs text-gray-400" data-testid="match-play-usa-original">({game.matchPlayScore.USA})</span>
                )}
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex flex-col items-center">
                <span className={`font-medium text-lg ${getMatchPlayColor(false)}`} data-testid="match-play-europe">
                  {useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE}
                </span>
                {useHandicaps && game.higherHandicapTeam !== 'EUROPE' && (
                  <span className="text-xs text-gray-400" data-testid="match-play-europe-original">({game.matchPlayScore.EUROPE})</span>
                )}
              </div>
            </div>
          </div>
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