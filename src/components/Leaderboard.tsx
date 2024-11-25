import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game } from '../types/game';

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
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
              setIsLoading(false);
            });

            return () => unsubscribeGames();
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
    if (!game.isStarted && !game.isComplete) return { USA: 0, EUROPE: 0 };
    
    if (game.isComplete) {
      const strokePlayPoint = game.strokePlayScore.USA < game.strokePlayScore.EUROPE ? 1 : 
                            game.strokePlayScore.USA === game.strokePlayScore.EUROPE ? 0.5 : 0;
      
      const matchPlayPoint = game.matchPlayScore.USA > game.matchPlayScore.EUROPE ? 1 :
                           game.matchPlayScore.USA === game.matchPlayScore.EUROPE ? 0.5 : 0;
      
      return {
        USA: strokePlayPoint + matchPlayPoint,
        EUROPE: (1 - strokePlayPoint) + (1 - matchPlayPoint)
      };
    }

    const currentPoints = { USA: 0, EUROPE: 0 };

    if (game.strokePlayScore.USA > 0 || game.strokePlayScore.EUROPE > 0) {
      if (game.strokePlayScore.USA === game.strokePlayScore.EUROPE) {
        currentPoints.USA += 0.5;
        currentPoints.EUROPE += 0.5;
      } else if (game.strokePlayScore.USA < game.strokePlayScore.EUROPE) {
        currentPoints.USA += 1;
      } else {
        currentPoints.EUROPE += 1;
      }
    }

    if (game.matchPlayScore.USA > 0 || game.matchPlayScore.EUROPE > 0) {
      if (game.matchPlayScore.USA === game.matchPlayScore.EUROPE) {
        currentPoints.USA += 0.5;
        currentPoints.EUROPE += 0.5;
      } else if (game.matchPlayScore.USA > game.matchPlayScore.EUROPE) {
        currentPoints.USA += 1;
      } else {
        currentPoints.EUROPE += 1;
      }
    }

    return currentPoints;
  };

  const calculateCurrentScore = (): { USA: number, EUROPE: number } => {
    let usaTotal = 0;
    let europeTotal = 0;

    games.forEach(game => {
      if (game.isComplete) {
        const points = calculateGamePoints(game);
        usaTotal += points.USA;
        europeTotal += points.EUROPE;
      }
    });

    return {
      USA: usaTotal,
      EUROPE: europeTotal
    };
  };

  const calculateProjectedScore = (): { USA: number, EUROPE: number } => {
    let usaTotal = 0;
    let europeTotal = 0;

    games.forEach(game => {
      const points = calculateGamePoints(game);
      usaTotal += points.USA;
      europeTotal += points.EUROPE;
    });

    return {
      USA: usaTotal,
      EUROPE: europeTotal
    };
  };

  const getStrokePlayHighlight = (usaScore: number, europeScore: number): { usa: string, europe: string } => {
    if (usaScore === 0 && europeScore === 0) return { usa: '', europe: '' };
    if (usaScore === europeScore) return { usa: '', europe: '' };
    return {
      usa: usaScore < europeScore ? 'text-green-500 font-bold' : 'text-gray-500',
      europe: europeScore < usaScore ? 'text-green-500 font-bold' : 'text-gray-500'
    };
  };

  const getMatchPlayHighlight = (usaScore: number, europeScore: number): { usa: string, europe: string } => {
    if (usaScore === 0 && europeScore === 0) return { usa: '', europe: '' };
    if (usaScore === europeScore) return { usa: '', europe: '' };
    return {
      usa: usaScore > europeScore ? 'text-green-500 font-bold' : 'text-gray-500',
      europe: europeScore > usaScore ? 'text-green-500 font-bold' : 'text-gray-500'
    };
  };

  const getPointsHighlight = (usaPoints: number, europePoints: number): { usa: string, europe: string } => {
    if (usaPoints === europePoints) return { usa: '', europe: '' };
    return {
      usa: usaPoints > europePoints ? 'text-green-500 font-bold' : 'text-gray-500',
      europe: europePoints > usaPoints ? 'text-green-500 font-bold' : 'text-gray-500'
    };
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
  const overallHighlight = getPointsHighlight(currentScore.USA, currentScore.EUROPE);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Score</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-3xl font-bold text-red-500 ${overallHighlight.usa}`}>
              {currentScore.USA}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-3xl font-bold text-blue-500 ${overallHighlight.europe}`}>
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
              <div className="text-2xl font-semibold text-red-500">
                {projectedScore.USA}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-blue-500">
                {projectedScore.EUROPE}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold dark:text-white">Individual Games</h2>
        
        {games.map((game) => {
          const points = calculateGamePoints(game);
          const strokePlayHighlight = getStrokePlayHighlight(game.strokePlayScore.USA, game.strokePlayScore.EUROPE);
          const matchPlayHighlight = getMatchPlayHighlight(game.matchPlayScore.USA, game.matchPlayScore.EUROPE);
          const pointsHighlight = getPointsHighlight(points.USA, points.EUROPE);

          return (
            <div
              key={game.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="font-medium text-red-500">{game.usaPlayerName}</div>
                  <div className="text-sm text-gray-500">USA</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Stroke Play (Total Strokes)
                    </div>
                    <div className="font-medium dark:text-white">
                      {(game.isStarted || game.isComplete) ? (
                        <span>
                          <span className={strokePlayHighlight.usa}>{game.strokePlayScore.USA}</span>
                          {' - '}
                          <span className={strokePlayHighlight.europe}>{game.strokePlayScore.EUROPE}</span>
                        </span>
                      ) : '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Match Play (Holes Won)
                    </div>
                    <div className="font-medium dark:text-white">
                      {(game.isStarted || game.isComplete) ? (
                        <span>
                          <span className={matchPlayHighlight.usa}>{game.matchPlayScore.USA}</span>
                          {' - '}
                          <span className={matchPlayHighlight.europe}>{game.matchPlayScore.EUROPE}</span>
                        </span>
                      ) : '-'}
                    </div>
                  </div>

                  {(game.isStarted || game.isComplete) && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {game.isComplete ? 'Final Points' : 'Current Points'}
                      </div>
                      <div className="font-medium dark:text-white">
                        <span className={pointsHighlight.usa}>{points.USA}</span>
                        {' - '}
                        <span className={pointsHighlight.europe}>{points.EUROPE}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="font-medium text-blue-500">
                    {game.europePlayerName}
                  </div>
                  <div className="text-sm text-gray-500">EUROPE</div>
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
          );
        })}
      </div>
    </div>
  );
}