import type { Game } from '../../types/game';

interface HandicapDisplayProps {
  game: Game;
  compact?: boolean;
  useHandicaps: boolean;
}

export default function HandicapDisplay({ game, compact = false, useHandicaps }: HandicapDisplayProps) {

  // Don't show anything if handicaps are disabled or if required data is missing
  if (!useHandicaps || 
      !game?.handicapStrokes || 
      game.handicapStrokes <= 0 || 
      !game.higherHandicapTeam || 
      !game.usaPlayerName || 
      !game.europePlayerName) {
    return null;
  }

  const playerGettingStrokes = game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName;

  return (
    <div className={`text-center text-sm text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : ''}`}>
      {playerGettingStrokes} gets {game.handicapStrokes} stroke{game.handicapStrokes !== 1 ? 's' : ''} added
    </div>
  );
}