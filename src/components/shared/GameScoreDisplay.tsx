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
      return usaWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-usa-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-europe-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
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
      return usaWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-usa-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-europe-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
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

  // Helper function for points coloring
  const getPointsColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-500';
    
    const usaPoints = useHandicaps ? game.points.adjusted.USA : game.points.raw.USA;
    const europePoints = useHandicaps ? game.points.adjusted.EUROPE : game.points.raw.EUROPE;
    const usaWinning = usaPoints > europePoints;
    const europeWinning = europePoints > usaPoints;
    const isTied = usaPoints === europePoints && 
                  (usaPoints > 0 || europePoints > 0);

    if (isUSA) {
      return usaWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-usa-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500 dark:text-emerald-400 font-extrabold text-europe-500' : isTied ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'text-gray-500';
    }
  };

  // Helper function for raw points coloring
  const getPointsRawColor = (isUSA: boolean) => {
    if (!game.isStarted) return 'text-gray-400 dark:text-gray-500';
    
    const usaPoints = game.points.raw.USA;
    const europePoints = game.points.raw.EUROPE;
    const usaWinning = usaPoints > europePoints;
    const europeWinning = europePoints > usaPoints;
    const isTied = usaPoints === europePoints && 
                  (usaPoints > 0 || europePoints > 0);

    if (isUSA) {
      return usaWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    } else {
      return europeWinning ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : isTied ? 'text-emerald-500/60 dark:text-emerald-400/60 font-medium' : 'text-gray-400 dark:text-gray-500';
    }
  };

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
          
          <div className="flex flex-col space-y-2">
            {/* Stroke Play Tile */}
            <div className="bg-gradient-to-br from-purple-900/80 to-purple-950 dark:from-purple-900/60 dark:to-black rounded-xl shadow-md p-2 border-2 border-purple-600/50 dark:border-purple-700/60 relative hover:shadow-lg transition-all hover:border-purple-500 dark:hover:border-purple-500/70">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1" data-testid="stroke-play-label">
                  <span className="text-sm">🏌️‍♂️</span>
                  <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Stroke Play</span>
                </div>
                
                <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
                  <span className={`text-lg ${getStrokePlayColor(true)}`} data-testid="stroke-play-usa">
                    {useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA}
                  </span>
                  <span className="text-gray-400 mx-1 font-light">-</span>
                  <span className={`text-lg ${getStrokePlayColor(false)}`} data-testid="stroke-play-europe">
                    {useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE}
                  </span>
                </div>
                
                {useHandicaps && (
                  <div className="text-right text-xs min-w-[80px]">
                    <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
                    <span className={getStrokePlayRawColor(true)} data-testid="stroke-play-usa-original">{game.strokePlayScore.USA}</span>
                    <span className="text-gray-400 dark:text-gray-500">) - (</span>
                    <span className={getStrokePlayRawColor(false)} data-testid="stroke-play-europe-original">{game.strokePlayScore.EUROPE}</span>
                    <span className="text-gray-400 dark:text-gray-500">)</span>
                  </div>
                )}
                {!useHandicaps && (
                  <div className="min-w-[80px]"></div>
                )}
              </div>
            </div>

            {/* Match Play Tile */}
            <div className="bg-gradient-to-br from-indigo-900/80 to-indigo-950 dark:from-indigo-900/60 dark:to-black rounded-xl shadow-md p-2 border-2 border-indigo-600/50 dark:border-indigo-700/60 relative hover:shadow-lg transition-all hover:border-indigo-500 dark:hover:border-indigo-500/70">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1" data-testid="match-play-label">
                  <span className="text-sm">🏆</span>
                  <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Match Play</span>
                </div>
                
                <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
                  <span className={`text-lg ${getMatchPlayColor(true)}`} data-testid="match-play-usa">
                    {useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA}
                  </span>
                  <span className="text-gray-400 mx-1 font-light">-</span>
                  <span className={`text-lg ${getMatchPlayColor(false)}`} data-testid="match-play-europe">
                    {useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE}
                  </span>
                </div>
                
                {useHandicaps && (
                  <div className="text-right text-xs min-w-[80px]">
                    <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
                    <span className={getMatchPlayRawColor(true)} data-testid="match-play-usa-original">{game.matchPlayScore.USA}</span>
                    <span className="text-gray-400 dark:text-gray-500">) - (</span>
                    <span className={getMatchPlayRawColor(false)} data-testid="match-play-europe-original">{game.matchPlayScore.EUROPE}</span>
                    <span className="text-gray-400 dark:text-gray-500">)</span>
                  </div>
                )}
                {!useHandicaps && (
                  <div className="min-w-[80px]"></div>
                )}
              </div>
            </div>

            {/* Game Points Tile */}
            <div className={`bg-gradient-to-br ${isComplete ? 'from-emerald-900/80 to-emerald-950 dark:from-emerald-900/60 dark:to-black border-2 border-emerald-600/50 dark:border-emerald-700/60 hover:border-emerald-500 dark:hover:border-emerald-500/70' : 'from-blue-900/80 to-blue-950 dark:from-blue-900/60 dark:to-black border-2 border-blue-600/50 dark:border-blue-700/60 hover:border-blue-500 dark:hover:border-blue-500/70'} rounded-xl shadow-md p-2 relative hover:shadow-lg transition-all`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1" data-testid="game-points-label">
                  <span className="text-sm">📊</span>
                  <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Game Points</span>
                </div>
                
                <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
                  <span className={`text-lg ${getPointsColor(true)}`} data-testid="game-points-usa">
                    {useHandicaps ? game.points.adjusted.USA : game.points.raw.USA}
                  </span>
                  <span className="text-gray-400 mx-1 font-light">-</span>
                  <span className={`text-lg ${getPointsColor(false)}`} data-testid="game-points-europe">
                    {useHandicaps ? game.points.adjusted.EUROPE : game.points.raw.EUROPE}
                  </span>
                </div>
                
                {useHandicaps && (
                  <div className="text-right text-xs min-w-[80px]">
                    <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
                    <span className={getPointsRawColor(true)} data-testid="game-points-usa-original">{game.points.raw.USA}</span>
                    <span className="text-gray-400 dark:text-gray-500">) - (</span>
                    <span className={getPointsRawColor(false)} data-testid="game-points-europe-original">{game.points.raw.EUROPE}</span>
                    <span className="text-gray-400 dark:text-gray-500">)</span>
                  </div>
                )}
                {!useHandicaps && (
                  <div className="min-w-[80px]"></div>
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