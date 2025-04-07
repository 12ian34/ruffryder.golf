import type { Game } from '../../types/game';

interface HandicapDisplayProps {
  game: Game;
  compact?: boolean;
  useHandicaps: boolean;
}

export default function HandicapDisplay({ game, compact = false, useHandicaps }: HandicapDisplayProps) {
  if (!useHandicaps || 
      !game?.handicapStrokes || 
      game.handicapStrokes <= 0 || 
      !game.higherHandicapTeam || 
      !game.usaPlayerName || 
      !game.europePlayerName) {
    return null;
  }

  // The player getting strokes added to their score is the OPPONENT of the higher handicap player
  const teamGettingStrokesAdded = game.higherHandicapTeam === 'USA' ? 'EUROPE' : 'USA';
  const playerGettingStrokesAdded = teamGettingStrokesAdded === 'USA' ? game.usaPlayerName : game.europePlayerName;
  const teamColor = teamGettingStrokesAdded === 'USA' ? 'text-usa-500' : 'text-europe-500';

  return (
    <div className={`text-center text-sm font-medium ${compact ? 'text-xs' : ''}`}>
      <span className={teamColor}>{playerGettingStrokesAdded}</span> gets {game.handicapStrokes} stroke{game.handicapStrokes !== 1 ? 's' : ''} added to their score
    </div>
  );
}