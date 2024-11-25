import { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import type { User } from '../types/user';
import ScoreEntry from './ScoreEntry';

interface GameManagementProps {
  userId: string | undefined;
}

export default function GameManagement({ userId }: GameManagementProps) {
  const [userGames, setUserGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError('User ID not found');
      setIsLoading(false);
      return;
    }

    // First get the user's linked player ID and admin status
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setLinkedPlayerId(userData.linkedPlayerId || null);
          setIsAdmin(userData.isAdmin || false);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to fetch user data');
        setIsLoading(false);
      }
    };

    fetchUserData();

    // Then get the active tournament
    const unsubscribeTournament = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        const activeTournament = snapshot.docs.find(doc => doc.data().isActive);
        if (activeTournament) {
          setActiveTournamentId(activeTournament.id);

          // Then get games for this tournament
          const unsubscribeGames = onSnapshot(
            collection(db, 'tournaments', activeTournament.id, 'games'),
            (gamesSnapshot) => {
              const gamesData = gamesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Game[];

              // Filter games based on user role and linked player
              const filteredGames = isAdmin 
                ? gamesData 
                : gamesData.filter(game => 
                    game.playerIds?.includes(linkedPlayerId)
                  );

              setUserGames(sortGames(filteredGames));
              setIsLoading(false);
            },
            (err) => {
              console.error('Error fetching games:', err);
              setError('Failed to load games');
              setIsLoading(false);
            }
          );

          return () => unsubscribeGames();
        } else {
          setUserGames([]);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching tournament:', err);
        setError('Failed to load tournament');
        setIsLoading(false);
      }
    );

    return () => unsubscribeTournament();
  }, [userId, linkedPlayerId, isAdmin]);

  const sortGames = (games: Game[]): Game[] => {
    return [...games].sort((a, b) => {
      // First, prioritize games where the current user is a player
      const aIsUserGame = a.playerIds?.includes(linkedPlayerId) || false;
      const bIsUserGame = b.playerIds?.includes(linkedPlayerId) || false;
      
      if (aIsUserGame && !bIsUserGame) return -1;
      if (!aIsUserGame && bIsUserGame) return 1;

      // Then sort by game status
      if (a.isStarted && !a.isComplete && (!b.isStarted || b.isComplete)) return -1;
      if (b.isStarted && !b.isComplete && (!a.isStarted || a.isComplete)) return 1;

      // Finally sort by completion status
      if (!a.isComplete && b.isComplete) return -1;
      if (a.isComplete && !b.isComplete) return 1;

      return 0;
    });
  };

  const handleStartGame = async (gameId: string) => {
    if (!activeTournamentId) return;

    try {
      await updateDoc(doc(db, 'tournaments', activeTournamentId, 'games', gameId), {
        isStarted: true,
        startTime: new Date()
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEndGame = async (gameId: string) => {
    if (!activeTournamentId) return;

    try {
      await updateDoc(doc(db, 'tournaments', activeTournamentId, 'games', gameId), {
        isComplete: true,
        endTime: new Date()
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!linkedPlayerId && !isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Your account is not linked to a player. Please contact an administrator.
        </div>
      </div>
    );
  }

  if (userGames.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          No games found
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {isAdmin 
            ? 'No games have been created in the current tournament.'
            : 'You haven\'t been assigned to any games in the current tournament.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-white">
        {isAdmin ? 'All Games' : 'Your Games'}
      </h2>
      
      {userGames.map((game) => {
        const isUserGame = game.playerIds?.includes(linkedPlayerId);
        const isActiveGame = game.isStarted && !game.isComplete;
        
        return (
          <div
            key={game.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 relative ${
              isUserGame ? 'border-2 border-blue-500' : ''
            } ${isActiveGame ? 'ring-2 ring-yellow-500' : ''}`}
          >
            {isUserGame && (
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  Your Game
                </span>
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium dark:text-white">
                  <span className="text-red-500">{game.usaPlayerName}</span>
                  {" vs "}
                  <span className="text-blue-500">{game.europePlayerName}</span>
                </h3>
                {game.handicapStrokes > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                game.isComplete
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : game.isStarted
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {game.isComplete ? 'Complete' : game.isStarted ? 'In Progress' : 'Not Started'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                <div className="text-lg font-semibold dark:text-white">
                  {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Match Play</div>
                <div className="text-lg font-semibold dark:text-white">
                  {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              {(!game.isStarted || isAdmin) && (
                <button
                  onClick={() => handleStartGame(game.id)}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  {game.isStarted ? 'Restart Game' : 'Start Game'}
                </button>
              )}

              {(game.isStarted || (isAdmin && game.isComplete)) && (
                <>
                  <button
                    onClick={() => setSelectedGameId(game.id)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {isAdmin ? 'Edit Scores' : 'Enter Scores'}
                  </button>
                  {!game.isComplete && (
                    <button
                      onClick={() => handleEndGame(game.id)}
                      className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      End Game
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {selectedGameId && activeTournamentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="relative max-w-2xl w-full my-8">
            <ScoreEntry
              gameId={selectedGameId}
              tournamentId={activeTournamentId}
              onClose={() => setSelectedGameId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}