import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game } from '../types/game';
import TournamentProgress from './TournamentProgress';

interface Scores {
  current: { USA: number; EUROPE: number };
  projected: { USA: number; EUROPE: number };
}

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [scores, setScores] = useState<Scores>({
    current: { USA: 0, EUROPE: 0 },
    projected: { USA: 0, EUROPE: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

              // Calculate current and projected scores
              const { current, projected } = calculateScores(gamesData);
              setScores({ current, projected });

              setIsLoading(false);
            });

            return () => unsubscribeGames();
          } else {
            setTournament(null);
            setGames([]);
            setScores({
              current: { USA: 0, EUROPE: 0 },
              projected: { USA: 0, EUROPE: 0 }
            });
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

  const calculateGamePoints = (game: Game): { USA: number; EUROPE: number } => {
    if (!game.isStarted) return { USA: 0, EUROPE: 0 };

    const strokePlayPoint = game.strokePlayScore.USA < game.strokePlayScore.EUROPE ? 1 :
      game.strokePlayScore.USA === game.strokePlayScore.EUROPE ? 0.5 : 0;

    const matchPlayPoint = game.matchPlayScore.USA > game.matchPlayScore.EUROPE ? 1 :
      game.matchPlayScore.USA === game.matchPlayScore.EUROPE ? 0.5 : 0;

    return {
      USA: strokePlayPoint + matchPlayPoint,
      EUROPE: (1 - strokePlayPoint) + (1 - matchPlayPoint)
    };
  };

  const calculateScores = (games: Game[]): { current: Scores['current']; projected: Scores['projected'] } => {
    let currentUSA = 0;
    let currentEUROPE = 0;
    let projectedUSA = 0;
    let projectedEUROPE = 0;

    games.forEach(game => {
      const points = calculateGamePoints(game);

      if (game.isComplete) {
        currentUSA += points.USA;
        currentEUROPE += points.EUROPE;
      }

      if (game.isStarted || game.isComplete) {
        projectedUSA += points.USA;
        projectedEUROPE += points.EUROPE;
      }
    });

    return {
      current: { USA: currentUSA, EUROPE: currentEUROPE },
      projected: { USA: projectedUSA, EUROPE: projectedEUROPE }
    };
  };

  const getScoreHighlight = (score1: number, score2: number): string => {
    if (score1 === score2) return '';
    return score1 > score2 ? 'text-green-500 dark:text-green-400' : '';
  };

  const currentScoreHighlight = {
    usa: getScoreHighlight(scores.current.USA, scores.current.EUROPE),
    europe: getScoreHighlight(scores.current.EUROPE, scores.current.USA)
  };

  const projectedScoreHighlight = {
    usa: getScoreHighlight(scores.projected.USA, scores.projected.EUROPE),
    europe: getScoreHighlight(scores.projected.EUROPE, scores.projected.USA)
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

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Score</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-3xl font-bold ${currentScoreHighlight.usa || 'text-red-500 dark:text-red-400'}`}>
              {scores.current.USA}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${currentScoreHighlight.europe || 'text-blue-500 dark:text-blue-400'}`}>
              {scores.current.EUROPE}
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
              <div className={`text-2xl font-semibold ${projectedScoreHighlight.usa || 'text-red-500 dark:text-red-400'}`}>
                {scores.projected.USA}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${projectedScoreHighlight.europe || 'text-blue-500 dark:text-blue-400'}`}>
                {scores.projected.EUROPE}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
            </div>
          </div>
        </div>

        {tournament.progress && tournament.progress.length > 0 && (
          <div className="mt-6 pt-4 border-t dark:border-gray-700">
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

          return (
            <div
              key={game.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="font-medium text-red-500 dark:text-red-400">
                    {game.usaPlayerName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
                </div>

                <div className="text-center space-y-2">
                  {(game.isStarted || game.isComplete) ? (
                    <>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Stroke Play
                        </div>
                        <div className="flex justify-center space-x-2">
                          <div className={`font-medium dark:text-white ${game.strokePlayScore.USA === game.strokePlayScore.EUROPE ? '' :
                              game.strokePlayScore.USA < game.strokePlayScore.EUROPE ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {game.strokePlayScore.USA}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                          <div className={`font-medium dark:text-white ${game.strokePlayScore.USA === game.strokePlayScore.EUROPE ? '' :
                              game.strokePlayScore.EUROPE < game.strokePlayScore.USA ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {game.strokePlayScore.EUROPE}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Match Play
                        </div>
                        <div className="flex justify-center space-x-2">
                          <div className={`font-medium dark:text-white ${game.matchPlayScore.USA === game.matchPlayScore.EUROPE ? '' :
                              game.matchPlayScore.USA > game.matchPlayScore.EUROPE ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {game.matchPlayScore.USA}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                          <div className={`font-medium dark:text-white ${game.matchPlayScore.USA === game.matchPlayScore.EUROPE ? '' :
                              game.matchPlayScore.EUROPE > game.matchPlayScore.USA ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {game.matchPlayScore.EUROPE}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Points
                        </div>
                        <div className="flex justify-center space-x-2">
                          <div className={`font-medium dark:text-white ${points.USA === points.EUROPE ? '' :
                              points.USA > points.EUROPE ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {points.USA}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                          <div className={`font-medium dark:text-white ${points.USA === points.EUROPE ? '' :
                              points.EUROPE > points.USA ? 'text-green-500 dark:text-green-400' : ''
                            }`}>
                            {points.EUROPE}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      -
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="font-medium text-blue-500 dark:text-blue-400">
                    {game.europePlayerName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${game.isComplete
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : game.isStarted
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                  {game.isComplete ? 'Complete' : game.isStarted ? 'In Progress' : 'Not Started'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}