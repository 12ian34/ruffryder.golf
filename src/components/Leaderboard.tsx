import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game, GameStatus } from '../types/game';
import TournamentProgress from './TournamentProgress';
import ScoreCard from './scorecard/ScoreCard';
import StatusFilter from './filters/StatusFilter';
import { GameList } from './GameList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<GameStatus>('all');
  const isOnline = useOnlineStatus();

  // Fetch active tournament and games
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get active tournament
        const tournamentsRef = collection(db, 'tournaments');
        const q = query(tournamentsRef, where('isActive', '==', true));
        const tournamentSnapshot = await onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const tournamentData = doc.data() as Tournament;
            setTournament({
              ...tournamentData,
              id: doc.id
            });
          } else {
            setTournament(null);
          }
        });

        return () => tournamentSnapshot();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch games for active tournament
  useEffect(() => {
    if (!tournament) return;

    const gamesRef = collection(db, 'tournaments', tournament.id, 'games');
    const unsubscribe = onSnapshot(gamesRef, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => {
        const data = doc.data() as Game;
        // Ensure the id is set from the document ID
        return {
          ...data,
          id: doc.id || data.id || `game-${doc.id}` // Fallback to ensure we always have an ID
        };
      });
      setGames(gamesData);
    });

    return () => unsubscribe();
  }, [tournament]);

  // Filter games based on status
  useEffect(() => {
    if (!games) return;

    let filtered = [...games];
    if (activeStatus !== 'all') {
      filtered = games.filter(game => {
        if (activeStatus === 'not_started') return !game.isStarted;
        if (activeStatus === 'in_progress') return game.isStarted && !game.isComplete;
        if (activeStatus === 'complete') return game.isComplete;
        return true;
      });
    }
    setFilteredGames(filtered);
  }, [games, activeStatus]);

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

  // Calculate totals from stored scores
  const totalStrokes = games.reduce((total, game) => {
    return {
      USA: total.USA + (tournament.useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA),
      EUROPE: total.EUROPE + (tournament.useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE)
    };
  }, { USA: 0, EUROPE: 0 });

  const rawStrokes = games.reduce((total, game) => ({
    USA: total.USA + game.strokePlayScore.USA,
    EUROPE: total.EUROPE + game.strokePlayScore.EUROPE
  }), { USA: 0, EUROPE: 0 });

  const totalHoles = games.reduce((total, game) => ({
    USA: total.USA + game.holes.reduce((sum, hole) => 
      sum + (tournament.useHandicaps ? (hole.usaPlayerMatchPlayAdjustedScore ?? 0) : (hole.usaPlayerMatchPlayScore ?? 0)), 0),
    EUROPE: total.EUROPE + game.holes.reduce((sum, hole) => 
      sum + (tournament.useHandicaps ? (hole.europePlayerMatchPlayAdjustedScore ?? 0) : (hole.europePlayerMatchPlayScore ?? 0)), 0)
  }), { USA: 0, EUROPE: 0 });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <ScoreCard
          currentScore={tournament.useHandicaps ? tournament.totalScore.adjusted : tournament.totalScore.raw}
          projectedScore={tournament.useHandicaps 
            ? (tournament.projectedScore?.adjusted || { USA: 0, EUROPE: 0 })
            : (tournament.projectedScore?.raw || { USA: 0, EUROPE: 0 })}
          totalStrokes={totalStrokes}
          rawStrokes={rawStrokes}
          totalHoles={totalHoles}
          useHandicaps={tournament.useHandicaps}
        />
        {!isOnline && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium">
            Offline Mode - Scores may not be up to date
          </div>
        )}
      </div>

      {tournament.progress && tournament.progress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TournamentProgress 
            progress={tournament.progress.map(p => ({
              timestamp: new Date(p.date),
              score: tournament.useHandicaps ? p.totalScore.adjusted : p.totalScore.raw,
              completedGames: games.filter(g => g.isComplete).length
            }))}
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
        
        <GameList
          games={filteredGames}
          isAdmin={false}
          onGameStatusChange={async () => {}} // No-op since we don't allow status changes in leaderboard
          isOnline={isOnline}
          useHandicaps={tournament.useHandicaps}
          tournamentSettings={{
            id: tournament.id,
            useHandicaps: tournament.useHandicaps,
            handicapStrokes: tournament.handicapStrokes,
            higherHandicapTeam: tournament.higherHandicapTeam
          }}
          showControls={false}
          showStatusFilter={false}
          linkedPlayerId={null}
        />
      </div>
    </div>
  );
}