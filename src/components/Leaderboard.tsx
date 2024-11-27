import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game } from '../types/game';
import TournamentProgress from './TournamentProgress';
import ScoreCard from './leaderboard/ScoreCard';
import GameCard from './leaderboard/GameCard';

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
      <ScoreCard
        currentScore={currentScore}
        projectedScore={projectedScore}
      />

      {tournament.progress && tournament.progress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TournamentProgress 
            progress={tournament.progress}
            totalGames={games.length}
          />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold dark:text-white">Individual Games</h2>
        
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            points={calculateGamePoints(game)}
            playerAvatars={playerAvatars}
          />
        ))}
      </div>
    </div>
  );
}