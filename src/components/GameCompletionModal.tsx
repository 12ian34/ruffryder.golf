import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

interface GameCompletionModalProps {
  game: Game;
  tournamentId: string;
  onClose: () => void;
  isOnline: boolean;
}

export default function GameCompletionModal({ game, tournamentId, onClose, isOnline }: GameCompletionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingScores = game.holes.filter(hole => 
    typeof hole.usaPlayerScore !== 'number' || 
    typeof hole.europePlayerScore !== 'number'
  );

  const handleConfirm = async () => {
    if (missingScores.length > 0) {
      setError(`Please enter scores for all holes before completing the game. Missing scores for holes: ${
        missingScores.map(hole => hole.holeNumber).join(', ')
      }`);
      return;
    }

    if (!isOnline) {
      setError('Cannot complete game while offline. Please check your internet connection and try again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await updateDoc(doc(db, 'tournaments', tournamentId, 'games', game.id), {
        isComplete: true,
        isStarted: true
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">
          Complete Game
        </h3>

        <div className="space-y-4">
          {!isOnline && (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
              <p className="font-medium">Offline Mode</p>
              <p className="text-sm mt-1">
                You are currently offline. Please check your internet connection before completing the game.
              </p>
            </div>
          )}

          {missingScores.length > 0 ? (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
              <p className="font-medium">Cannot Complete Game</p>
              <p className="text-sm mt-1">
                Missing scores for holes: {missingScores.map(hole => hole.holeNumber).join(', ')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to mark this game as complete? This will finalize the scores and update the tournament standings.
              </p>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2 dark:text-white">Final Scores:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                    <div className="font-medium dark:text-white">
                      {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Match Play</div>
                    <div className="font-medium dark:text-white">
                      {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || missingScores.length > 0 || !isOnline}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Completing...' : 'Complete Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}