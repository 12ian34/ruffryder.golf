import PlayerAvatar from '../PlayerAvatar';
import { calculateGamePoints } from '../../utils/gamePoints';
import type { Game } from '../../types/game';

interface GameCardProps {
  game: Game;
  isAdmin: boolean;
  onStatusChange: (game: Game, status: 'not_started' | 'in_progress' | 'complete') => void;
  onEnterScores: () => void;
}

export default function GameCard({ game, isAdmin, onStatusChange, onEnterScores }: GameCardProps) {
  const points = calculateGamePoints(game);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="grid grid-cols-3 gap-4">
        {/* USA Player */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <PlayerAvatar
              playerId={game.usaPlayerId}
              name={game.usaPlayerName}
            />
            <div className="font-medium text-red-500">
              {game.usaPlayerName}
            </div>
          </div>
          <div className="text-sm text-gray-500">USA</div>
        </div>

        {/* Game Status & Scores */}
        <div className="text-center flex flex-col justify-center">
          {game.isComplete ? (
            <>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Final Score
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                  <div className="text-lg font-bold">
                    {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Holes Won</div>
                  <div className="text-lg font-bold">
                    {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Points Won</div>
                  <div className="text-lg font-bold text-green-500">
                    {points.USA} - {points.EUROPE}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => onStatusChange(game, 'in_progress')}
                  className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                >
                  Mark as In Progress
                </button>
              )}
            </>
          ) : game.isStarted ? (
            <>
              <div className="text-sm font-medium text-yellow-500">
                In Progress
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                  <div className="text-lg text-gray-400">
                    {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Holes Won</div>
                  <div className="text-lg text-gray-400">
                    {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                  </div>
                </div>
              </div>
              <button
                onClick={onEnterScores}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Enter Scores
              </button>
              {isAdmin && (
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => onStatusChange(game, 'not_started')}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Mark as Not Started
                  </button>
                  <button
                    onClick={() => onStatusChange(game, 'complete')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    Mark as Complete
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onEnterScores}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Start Game
              </button>
              {isAdmin && game.strokePlayScore.USA > 0 && (
                <button
                  onClick={() => onStatusChange(game, 'in_progress')}
                  className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                >
                  Mark as In Progress
                </button>
              )}
            </>
          )}
        </div>

        {/* Europe Player */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <PlayerAvatar
              playerId={game.europePlayerId}
              name={game.europePlayerName}
            />
            <div className="font-medium text-blue-500">
              {game.europePlayerName}
            </div>
          </div>
          <div className="text-sm text-gray-500">EUROPE</div>
        </div>
      </div>

      {game.handicapStrokes > 0 && game.higherHandicapTeam && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
        </div>
      )}
    </div>
  );
}