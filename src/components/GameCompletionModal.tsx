import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';
import { calculateGamePoints } from '../utils/gamePoints';

interface GameCompletionModalProps {
  game: Game;
  tournamentId: string;
  onClose: () => void;
  isOnline: boolean;
  useHandicaps: boolean;
}

export default function GameCompletionModal({ game, tournamentId, onClose, isOnline, useHandicaps }: GameCompletionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
        isStarted: true,
        status: 'complete'
      });

      // Update tournament scores after marking the game as complete
      await updateTournamentScores(tournamentId);

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const strokePlayScores = useHandicaps ? {
    USA: game.strokePlayScore.adjustedUSA,
    EUROPE: game.strokePlayScore.adjustedEUROPE
  } : {
    USA: game.strokePlayScore.USA,
    EUROPE: game.strokePlayScore.EUROPE
  };

  const matchPlayScores = useHandicaps ? {
    USA: game.matchPlayScore.adjustedUSA,
    EUROPE: game.matchPlayScore.adjustedEUROPE
  } : {
    USA: game.matchPlayScore.USA,
    EUROPE: game.matchPlayScore.EUROPE
  };

  // Calculate points that will be added
  const points = calculateGamePoints(game);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-gray-100">
            Complete Game
          </h3>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to mark this game as complete? This will finalize the scores and update the tournament standings.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                {/* Final Scores Section */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Final Scores</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                      <div className="font-medium text-lg dark:text-white">
                        {strokePlayScores.USA} - {strokePlayScores.EUROPE}
                        {useHandicaps && (
                          <div className="text-xs text-gray-400">
                            Raw: {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Match Play</div>
                      <div className="font-medium text-lg dark:text-white">
                        {matchPlayScores.USA} - {matchPlayScores.EUROPE}
                        {useHandicaps && (
                          <div className="text-xs text-gray-400">
                            Raw: {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Points Section */}
                <div className="p-3">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tournament Points</h4>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Raw Points</div>
                      <div className="grid grid-cols-2 gap-6 mt-1">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
                          <div className="text-2xl font-semibold text-usa-500">{points.raw.USA}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
                          <div className="text-2xl font-semibold text-europe-500">{points.raw.EUROPE}</div>
                        </div>
                      </div>
                    </div>

                    {useHandicaps && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-2">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Adjusted Points</div>
                        <div className="grid grid-cols-2 gap-6 mt-1">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
                            <div className="text-2xl font-semibold text-usa-500">{points.adjusted.USA}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
                            <div className="text-2xl font-semibold text-europe-500">{points.adjusted.EUROPE}</div>
                          </div>
                        </div>
                      </div>
                    )}
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
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
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
              className="px-6 py-2 border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Completing...' : 'Complete Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}