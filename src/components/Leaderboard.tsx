import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game, GameStatus } from '../types/game';
import TournamentProgress from './TournamentProgress';
import ScoreCard from './scorecard/ScoreCard';
import GameCard from './GameCard';
import StatusFilter from './filters/StatusFilter';
import { calculateGamePoints } from '../utils/gamePoints';

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<GameStatus>('all');

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
              
              // Sort games by completion status and number of holes completed
              const sortedGames = [...gamesData].sort((a, b) => {
                if (a.isComplete !== b.isComplete) {
                  return a.isComplete ? -1 : 1;
                }
                const aHolesCompleted = a.holes.filter(h => h.usaPlayerScore && h.europePlayerScore).length;
                const bHolesCompleted = b.holes.filter(h => h.usaPlayerScore && h.europePlayerScore).length;
                return bHolesCompleted - aHolesCompleted;
              });

              setGames(sortedGames);
              setIsLoading(false);
            });

            return () => {
              unsubscribeGames();
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

  useEffect(() => {
    // Filter games based on active status
    const filtered = games.filter(game => {
      if (activeStatus === 'all') return true;
      if (activeStatus === 'complete') return game.isComplete;
      if (activeStatus === 'in_progress') return !game.isComplete && game.isStarted;
      return !game.isComplete && !game.isStarted;
    });
    setFilteredGames(filtered);
  }, [games, activeStatus]);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold dark:text-white">Individual Games</h2>
          <StatusFilter
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
          />
        </div>
        
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              showControls={false}
              compact={true}
            />
          ))}

          {filteredGames.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No games found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}