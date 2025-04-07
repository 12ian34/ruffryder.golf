import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import ScoreEntry from '../components/ScoreEntry';

export default function ScoreEntryPage() {
  const { gameId, tournamentId } = useParams<{ gameId: string; tournamentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the previous location from state or default to the current path
  const previousLocation = location.state?.from || `/score-entry/${tournamentId}/${gameId}`;

  const fetchGame = async () => {
    if (!gameId || !tournamentId) {
      setError('Game ID or Tournament ID not provided');
      setIsLoading(false);
      return;
    }

    try {
      const gameDoc = await getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId));
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as Game;
      setGame(gameData);
    } catch (err: any) {
      setError(err.message || 'Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchGame();
  }, [currentUser, gameId, tournamentId, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Game not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Enter Scores
            </h1>
            <button
              onClick={() => navigate(previousLocation)}
              className="text-purple-500 hover:text-purple-600 dark:text-purple-400"
            >
              Back
            </button>
          </div>
          <ScoreEntry
            gameId={gameId!}
            tournamentId={tournamentId!}
            onClose={() => navigate(previousLocation)}
            onSave={async () => {
              // After saving, refresh the game data
              setIsLoading(true);
              await fetchGame();
              setIsLoading(false);
            }}
            useHandicaps={game.useHandicaps}
          />
        </div>
      </div>
    </div>
  );
} 