import type { Game } from '../../types/game';
import PlayerAvatar from '../PlayerAvatar';
import GameScoreDisplay from './GameScoreDisplay';

interface GameCardProps {
  game: Game;
  points: { USA: number, EUROPE: number };
  playerAvatars: Map<string, { customEmoji?: string }>;
}

export default function GameCard({ game, points, playerAvatars }: GameCardProps) {
  const isComplete = game.isComplete;
  const isInProgress = !isComplete && game.isStarted;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="grid grid-cols-3 gap-4">
        {/* USA Player */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <PlayerAvatar
              playerId={game.usaPlayerId}
              name={game.usaPlayerName}
              customEmoji={playerAvatars.get(game.usaPlayerId)?.customEmoji}
            />
            <div className="font-medium text-red-500">
              {game.usaPlayerName}
            </div>
          </div>
          <div className="text-sm text-gray-500">USA</div>
        </div>

        {/* Scores */}
        <div className="text-center flex flex-col justify-between">
          <div className="space-y-3">
            <GameScoreDisplay
              label="Stroke Play"
              usaScore={game.strokePlayScore.USA}
              europeScore={game.strokePlayScore.EUROPE}
              isComplete={isComplete}
            />

            <GameScoreDisplay
              label="Match Play"
              usaScore={game.matchPlayScore.USA}
              europeScore={game.matchPlayScore.EUROPE}
              isComplete={isComplete}
            />

            <GameScoreDisplay
              label="Points"
              usaScore={points.USA}
              europeScore={points.EUROPE}
              isComplete={isComplete}
              isProjected={!isComplete}
            />
          </div>

          <div className="mt-2 text-center">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isComplete
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : isInProgress
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started'}
            </span>
          </div>
        </div>

        {/* Europe Player */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <PlayerAvatar
              playerId={game.europePlayerId}
              name={game.europePlayerName}
              customEmoji={playerAvatars.get(game.europePlayerId)?.customEmoji}
            />
            <div className="font-medium text-blue-500">
              {game.europePlayerName}
            </div>
          </div>
          <div className="text-sm text-gray-500">EUROPE</div>
        </div>
      </div>

      {game.handicapStrokes > 0 && game.higherHandicapTeam && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
        </div>
      )}
    </div>
  );
}