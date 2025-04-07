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
      return usaWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
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
      return usaWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    }
  };

  // Helper function for stroke play raw scores
  const getStrokePlayRawColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-400 dark:text-gray-500';
    
    const usaScore = game.strokePlayScore.USA;
    const europeScore = game.strokePlayScore.EUROPE;
    const usaWinning = usaScore < europeScore;
    const europeWinning = europeScore < usaScore;
    const isTied = usaScore === europeScore && 
                  (usaScore > 0 || europeScore > 0);

    if (isUSA) {
      return usaWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    }
  };

  // Helper function for match play raw scores
  const getMatchPlayRawColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-400 dark:text-gray-500';
    
    const usaScore = game.matchPlayScore.USA;
    const europeScore = game.matchPlayScore.EUROPE;
    const usaWinning = usaScore > europeScore;
    const europeWinning = europeScore > usaScore;
    const isTied = usaScore === europeScore && 
                  (usaScore > 0 || europeScore > 0);

    if (isUSA) {
      return usaWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    }
  };

  const status = {
    label: isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started',
    bgColor: isComplete ? 'bg-emerald-500 dark:bg-emerald-600' : isInProgress ? 'bg-europe-500 dark:bg-europe-400' : 'bg-gray-800 dark:bg-gray-700',
    textColor: isComplete ? 'text-white' : isInProgress ? 'text-white' : 'text-white',
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
                rounded-md shadow-md
              `} 
              data-testid="game-status"
            >
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {/* Stroke Play Tile */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-gray-800 dark:to-indigo-900/30 rounded-xl shadow-md p-3 border-2 border-indigo-200 dark:border-indigo-700/40 relative hover:shadow-lg transition-all hover:border-indigo-300 dark:hover:border-indigo-600/50">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 flex items-center" data-testid="stroke-play-label">
                <span className="mr-1 text-sm">🏌️‍♂️</span>
                <span>Stroke Play</span>
              </h3>
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="flex justify-center items-center">
                    <span className={`text-lg ${getStrokePlayColor(true)}`} data-testid="stroke-play-usa">
                      {useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA}
                    </span>
                    <span className="text-gray-500 mx-2 font-light">-</span>
                    <span className={`text-lg ${getStrokePlayColor(false)}`} data-testid="stroke-play-europe">
                      {useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE}
                    </span>
                  </div>
                  {useHandicaps && (
                    <div className="inline-flex items-center mt-1">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1">Raw:</span>
                      <span className={`text-xs ${getStrokePlayRawColor(true)}`} data-testid="stroke-play-usa-original">
                        {game.strokePlayScore.USA}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5 text-xs">-</span>
                      <span className={`text-xs ${getStrokePlayRawColor(false)}`} data-testid="stroke-play-europe-original">
                        {game.strokePlayScore.EUROPE}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Match Play Tile */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-gray-800 dark:to-amber-900/30 rounded-xl shadow-md p-3 border-2 border-amber-200 dark:border-amber-700/40 relative hover:shadow-lg transition-all hover:border-amber-300 dark:hover:border-amber-600/50">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 flex items-center" data-testid="match-play-label">
                <span className="mr-1 text-sm">🏆</span>
                <span>Match Play</span>
              </h3>
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="flex justify-center items-center">
                    <span className={`text-lg ${getMatchPlayColor(true)}`} data-testid="match-play-usa">
                      {useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA}
                    </span>
                    <span className="text-gray-500 mx-2 font-light">-</span>
                    <span className={`text-lg ${getMatchPlayColor(false)}`} data-testid="match-play-europe">
                      {useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE}
                    </span>
                  </div>
                  {useHandicaps && (
                    <div className="inline-flex items-center mt-1">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1">Raw:</span>
                      <span className={`text-xs ${getMatchPlayRawColor(true)}`} data-testid="match-play-usa-original">
                        {game.matchPlayScore.USA}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5 text-xs">-</span>
                      <span className={`text-xs ${getMatchPlayRawColor(false)}`} data-testid="match-play-europe-original">
                        {game.matchPlayScore.EUROPE}
                      </span>
                    </div>
                  )}
                </div>
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