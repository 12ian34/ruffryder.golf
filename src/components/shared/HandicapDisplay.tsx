import type { Game } from '../../types/game';

interface HandicapDisplayProps {
  game: Game;
  compact?: boolean;
}

export default function HandicapDisplay({ game, compact = false }: HandicapDisplayProps) {
  if (!game.handicapStrokes || !game.higherHandicapTeam) {
    return null;
  }

  return (
    <div className={`text-center text-sm text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : ''}`}>
      {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
    </div>
  );
}