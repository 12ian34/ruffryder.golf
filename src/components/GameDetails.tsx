import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

interface GameDetailsProps {
  gameId: string;
  onClose?: () => void;
}

export default function GameDetails({ gameId, onClose }: GameDetailsProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          setGame(gameDoc.data() as Game);
        } else {
          setError('Game not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || 'Game not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">
          Game Details
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-blue-500 mb-1">USA</h3>
          <p className="text-lg font-semibold dark:text-white">
            {game.usaPlayerName}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-red-500 mb-1">Europe</h3>
          <p className="text-lg font-semibold dark:text-white">
            {game.europePlayerName}
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Stroke Play
            </h3>
            <p className="text-lg font-semibold dark:text-white">
              {game.strokePlayScore.usa} - {game.strokePlayScore.europe}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Match Play
            </h3>
            <p className="text-lg font-semibold dark:text-white">
              {game.matchPlayScore.usa} - {game.matchPlayScore.europe}
            </p>
          </div>
        </div>

        {/* Hole-by-hole scores */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Hole-by-Hole Scores
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Front Nine</h4>
              {game.holes.slice(0, 9).map((hole) => (
                <div
                  key={hole.holeNumber}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    Hole {hole.holeNumber}
                  </span>
                  <span className="font-medium dark:text-white">
                    {hole.usaPlayerScore || '-'} - {hole.europePlayerScore || '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Back Nine</h4>
              {game.holes.slice(9).map((hole) => (
                <div
                  key={hole.holeNumber}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    Hole {hole.holeNumber}
                  </span>
                  <span className="font-medium dark:text-white">
                    {hole.usaPlayerScore || '-'} - {hole.europePlayerScore || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}