import { ReactNode } from 'react';
import type { Game } from '../../types/game';

// Helper function for stroke play score coloring
export const getStrokePlayColor = (game: Game, isUSA: boolean, useHandicaps: boolean) => {
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

// Helper function for match play score coloring
export const getMatchPlayColor = (game: Game, isUSA: boolean, useHandicaps: boolean) => {
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

// Helper function for raw stroke play scores
export const getStrokePlayRawColor = (game: Game, isUSA: boolean) => {
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

// Helper function for raw match play scores
export const getMatchPlayRawColor = (game: Game, isUSA: boolean) => {
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
export const getPointsColor = (game: Game, isUSA: boolean, useHandicaps: boolean) => {
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
export const getPointsRawColor = (game: Game, isUSA: boolean) => {
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

// Shared Score Tile Components
interface ScoreTileProps {
  game: Game;
  useHandicaps: boolean;
  className?: string;
  testIdPrefix?: string;
  label: ReactNode;
  icon: string;
}

// StrokePlayTile Component
export const StrokePlayTile = ({ game, useHandicaps, className = "", testIdPrefix = "" }: Omit<ScoreTileProps, 'label' | 'icon'>) => (
  <div className={`bg-gradient-to-br from-purple-900/80 to-purple-950 dark:from-purple-900/60 dark:to-black rounded-xl shadow-md p-2 border-2 border-purple-600/50 dark:border-purple-700/60 relative hover:shadow-lg transition-all hover:border-purple-500 dark:hover:border-purple-500/70 ${className}`}>
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-1" data-testid={`${testIdPrefix}stroke-play-label`}>
        <span className="text-sm">🏌️‍♂️</span>
        <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Stroke Play</span>
      </div>
      
      <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
        <span className={`text-lg ${getStrokePlayColor(game, true, useHandicaps)}`} data-testid={`${testIdPrefix}stroke-play-usa`}>
          {useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA}
        </span>
        <span className="text-gray-400 mx-1 font-light">-</span>
        <span className={`text-lg ${getStrokePlayColor(game, false, useHandicaps)}`} data-testid={`${testIdPrefix}stroke-play-europe`}>
          {useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE}
        </span>
      </div>
      
      {useHandicaps && (
        <div className="text-right text-xs min-w-[80px]">
          <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
          <span className={getStrokePlayRawColor(game, true)} data-testid={`${testIdPrefix}stroke-play-usa-original`}>{game.strokePlayScore.USA}</span>
          <span className="text-gray-400 dark:text-gray-500">) - (</span>
          <span className={getStrokePlayRawColor(game, false)} data-testid={`${testIdPrefix}stroke-play-europe-original`}>{game.strokePlayScore.EUROPE}</span>
          <span className="text-gray-400 dark:text-gray-500">)</span>
        </div>
      )}
      {!useHandicaps && (
        <div className="min-w-[80px]"></div>
      )}
    </div>
  </div>
);

// MatchPlayTile Component
export const MatchPlayTile = ({ game, useHandicaps, className = "", testIdPrefix = "" }: Omit<ScoreTileProps, 'label' | 'icon'>) => (
  <div className={`bg-gradient-to-br from-indigo-900/80 to-indigo-950 dark:from-indigo-900/60 dark:to-black rounded-xl shadow-md p-2 border-2 border-indigo-600/50 dark:border-indigo-700/60 relative hover:shadow-lg transition-all hover:border-indigo-500 dark:hover:border-indigo-500/70 ${className}`}>
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-1" data-testid={`${testIdPrefix}match-play-label`}>
        <span className="text-sm">🏆</span>
        <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Match Play</span>
      </div>
      
      <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
        <span className={`text-lg ${getMatchPlayColor(game, true, useHandicaps)}`} data-testid={`${testIdPrefix}match-play-usa`}>
          {useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA}
        </span>
        <span className="text-gray-400 mx-1 font-light">-</span>
        <span className={`text-lg ${getMatchPlayColor(game, false, useHandicaps)}`} data-testid={`${testIdPrefix}match-play-europe`}>
          {useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE}
        </span>
      </div>
      
      {useHandicaps && (
        <div className="text-right text-xs min-w-[80px]">
          <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
          <span className={getMatchPlayRawColor(game, true)} data-testid={`${testIdPrefix}match-play-usa-original`}>{game.matchPlayScore.USA}</span>
          <span className="text-gray-400 dark:text-gray-500">) - (</span>
          <span className={getMatchPlayRawColor(game, false)} data-testid={`${testIdPrefix}match-play-europe-original`}>{game.matchPlayScore.EUROPE}</span>
          <span className="text-gray-400 dark:text-gray-500">)</span>
        </div>
      )}
      {!useHandicaps && (
        <div className="min-w-[80px]"></div>
      )}
    </div>
  </div>
);

// GamePointsTile Component
export const GamePointsTile = ({ game, useHandicaps, className = "", testIdPrefix = "" }: Omit<ScoreTileProps, 'label' | 'icon'>) => (
  <div className={`bg-gradient-to-br ${game.isComplete ? 'from-emerald-900/80 to-emerald-950 dark:from-emerald-900/60 dark:to-black border-2 border-emerald-600/50 dark:border-emerald-700/60 hover:border-emerald-500 dark:hover:border-emerald-500/70' : 'from-blue-900/80 to-blue-950 dark:from-blue-900/60 dark:to-black border-2 border-blue-600/50 dark:border-blue-700/60 hover:border-blue-500 dark:hover:border-blue-500/70'} rounded-xl shadow-md p-2 relative hover:shadow-lg transition-all ${className}`}>
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-1" data-testid={`${testIdPrefix}game-points-label`}>
        <span className="text-sm">📊</span>
        <span className="text-xs font-bold text-gray-200 dark:text-gray-200">Game Points</span>
      </div>
      
      <div className={`flex-1 flex ${useHandicaps ? 'justify-center' : 'justify-center'} items-center`}>
        <span className={`text-lg ${getPointsColor(game, true, useHandicaps)}`} data-testid={`${testIdPrefix}game-points-usa`}>
          {useHandicaps ? game.points.adjusted.USA : game.points.raw.USA}
        </span>
        <span className="text-gray-400 mx-1 font-light">-</span>
        <span className={`text-lg ${getPointsColor(game, false, useHandicaps)}`} data-testid={`${testIdPrefix}game-points-europe`}>
          {useHandicaps ? game.points.adjusted.EUROPE : game.points.raw.EUROPE}
        </span>
      </div>
      
      {useHandicaps && (
        <div className="text-right text-xs min-w-[80px]">
          <span className="text-gray-400 dark:text-gray-500">Raw: (</span>
          <span className={getPointsRawColor(game, true)} data-testid={`${testIdPrefix}game-points-usa-original`}>{game.points.raw.USA}</span>
          <span className="text-gray-400 dark:text-gray-500">) - (</span>
          <span className={getPointsRawColor(game, false)} data-testid={`${testIdPrefix}game-points-europe-original`}>{game.points.raw.EUROPE}</span>
          <span className="text-gray-400 dark:text-gray-500">)</span>
        </div>
      )}
      {!useHandicaps && (
        <div className="min-w-[80px]"></div>
      )}
    </div>
  </div>
);

// ScoreTiles component that renders all three tiles
export const ScoreTiles = ({ game, useHandicaps, className = "", testIdPrefix = "" }: Omit<ScoreTileProps, 'label' | 'icon'>) => (
  <div className={`flex flex-col space-y-3 ${className}`}>
    <StrokePlayTile game={game} useHandicaps={useHandicaps} testIdPrefix={testIdPrefix} />
    <MatchPlayTile game={game} useHandicaps={useHandicaps} testIdPrefix={testIdPrefix} />
    <GamePointsTile game={game} useHandicaps={useHandicaps} testIdPrefix={testIdPrefix} />
  </div>
); 