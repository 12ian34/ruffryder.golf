import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game } from '../types/game';
import PlayerAvatar from './PlayerAvatar';
import TournamentProgress from './TournamentProgress';

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerAvatars, setPlayerAvatars] = useState<Map<string, { customEmoji?: string }>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentQuery = query(tournamentsRef, where('isActive', '==', true));
        
        const unsubscribeTournament = onSnapshot(tournamentQuery, async (snapshot) => {
          if (!snapshot.empty) {
            const tournamentDoc = snapshot.docs[0];
            const tournamentData = {
              id: tournamentDoc.id,
              ...tournamentDoc.data()
            } as Tournament;
            setTournament(tournamentData);

            const gamesRef = collection(db, 'tournaments', tournamentDoc.id, 'games');
            const unsubscribeGames = onSnapshot(gamesRef, (gamesSnapshot) => {
              const gamesData = gamesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Game[];
              setGames(gamesData);
              setIsLoading(false);
            });

            // Fetch player avatars
            const usersRef = collection(db, 'users');
            const unsubscribeUsers = onSnapshot(usersRef, (usersSnapshot) => {
              const newPlayerAvatars = new Map();
              usersSnapshot.docs.forEach(doc => {
                const userData = doc.data();
                if (userData.linkedPlayerId && userData.customEmoji) {
                  newPlayerAvatars.set(userData.linkedPlayerId, {
                    customEmoji: userData.customEmoji
                  });
                }
              });
              setPlayerAvatars(newPlayerAvatars);
            });

            return () => {
              unsubscribeGames();
              unsubscribeUsers();
            };
          } else {
            setTournament(null);
            setGames([]);
            setIsLoading(false);
          }
        });

        return unsubscribeTournament;
      } catch (err: any) {
        console.error('Error loading tournament data:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const calculateGamePoints = (game: Game): { USA: number, EUROPE: number } => {
    if (!game.isStarted) return { USA: 0, EUROPE: 0 };
    
    const points = {
      USA: 0,
      EUROPE: 0
    };

    if (game.isComplete) {
      // Stroke play point
      if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
        points.USA += 1;
      } else if (game.strokePlayScore.USA > game.strokePlayScore.EUROPE) {
        points.EUROPE += 1;
      } else {
        points.USA += 0.5;
        points.EUROPE += 0.5;
      }

      // Match play point
      if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
        points.USA += 1;
      } else if (game.matchPlayScore.USA < game.matchPlayScore.EUROPE) {
        points.EUROPE += 1;
      } else {
        points.USA += 0.5;
        points.EUROPE += 0.5;
      }
    } else if (game.isStarted) {
      // For in-progress games, show projected points
      if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
        points.USA += 1;
      } else if (game.strokePlayScore.USA > game.strokePlayScore.EUROPE) {
        points.EUROPE += 1;
      } else if (game.strokePlayScore.USA > 0 || game.strokePlayScore.EUROPE > 0) {
        points.USA += 0.5;
        points.EUROPE += 0.5;
      }

      if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
        points.USA += 1;
      } else if (game.matchPlayScore.USA < game.matchPlayScore.EUROPE) {
        points.EUROPE += 1;
      } else if (game.matchPlayScore.USA > 0 || game.matchPlayScore.EUROPE > 0) {
        points.USA += 0.5;
        points.EUROPE += 0.5;
      }
    }

    return points;
  };

  const calculateCurrentScore = (): { USA: number, EUROPE: number } => {
    return games.reduce((total, game) => {
      if (game.isComplete) {
        const points = calculateGamePoints(game);
        return {
          USA: total.USA + points.USA,
          EUROPE: total.EUROPE + points.EUROPE
        };
      }
      return total;
    }, { USA: 0, EUROPE: 0 });
  };

  const calculateProjectedScore = (): { USA: number, EUROPE: number } => {
    return games.reduce((total, game) => {
      if (game.isStarted) {
        const points = calculateGamePoints(game);
        return {
          USA: total.USA + points.USA,
          EUROPE: total.EUROPE + points.EUROPE
        };
      }
      return total;
    }, { USA: 0, EUROPE: 0 });
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
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400">
          Error Loading Data
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {error}
        </p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          No Active Tournament
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          There is no tournament currently in progress.
        </p>
      </div>
    );
  }

  const currentScore = calculateCurrentScore();
  const projectedScore = calculateProjectedScore();

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Score</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-3xl font-bold ${currentScore.USA > currentScore.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
              {currentScore.USA}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${currentScore.EUROPE > currentScore.USA ? 'text-green-500' : 'text-gray-500'}`}>
              {currentScore.EUROPE}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Projected Final Score
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className={`text-2xl font-semibold ${projectedScore.USA > projectedScore.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
                {projectedScore.USA}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${projectedScore.EUROPE > projectedScore.USA ? 'text-green-500' : 'text-gray-500'}`}>
                {projectedScore.EUROPE}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
            </div>
          </div>
        </div>

        {tournament.progress && tournament.progress.length > 0 && (
          <div className="mt-6">
            <TournamentProgress 
              progress={tournament.progress}
              totalGames={games.length}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold dark:text-white">Individual Games</h2>
        
        {games.map((game) => {
          const points = calculateGamePoints(game);
          const isComplete = game.isComplete;

          return (
            <div
              key={game.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="grid grid-cols-3 gap-4">
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
                
                <div className="text-center flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Stroke Play
                      </div>
                      <div className="flex justify-center space-x-4">
                        <div className={`font-medium ${
                          isComplete ? (
                            game.strokePlayScore.USA < game.strokePlayScore.EUROPE ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {game.strokePlayScore.USA}
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className={`font-medium ${
                          isComplete ? (
                            game.strokePlayScore.EUROPE < game.strokePlayScore.USA ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {game.strokePlayScore.EUROPE}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Match Play
                      </div>
                      <div className="flex justify-center space-x-4">
                        <div className={`font-medium ${
                          isComplete ? (
                            game.matchPlayScore.USA > game.matchPlayScore.EUROPE ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {game.matchPlayScore.USA}
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className={`font-medium ${
                          isComplete ? (
                            game.matchPlayScore.EUROPE > game.matchPlayScore.USA ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {game.matchPlayScore.EUROPE}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {isComplete ? 'Final Points' : 'Projected Points'}
                      </div>
                      <div className="flex justify-center space-x-4">
                        <div className={`font-medium ${
                          isComplete ? (
                            points.USA > points.EUROPE ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {points.USA}
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className={`font-medium ${
                          isComplete ? (
                            points.EUROPE > points.USA ? 'text-green-500' : 'text-gray-500'
                          ) : 'text-gray-400'
                        }`}>
                          {points.EUROPE}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      game.isComplete
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : game.isStarted
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {game.isComplete ? 'Complete' : game.isStarted ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                </div>
                
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
        })}
      </div>
    </div>
  );
}