import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament } from '../types/tournament';
import type { Game, GameStatus } from '../types/game';
import TournamentProgress from './TournamentProgress';
import ScoreCard from './scorecard/ScoreCard';
import StatusFilter from './filters/StatusFilter';
import { GameList } from './GameList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../utils/analytics';

export default function Leaderboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<GameStatus>('all');
  const isOnline = useOnlineStatus();
  const { currentUser } = useAuth();
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;

    // Track leaderboard view
    track('leaderboard_viewed');

    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setTournament(null);
      setGames([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      where('isActive', '==', true)
    );

    const unsubscribeTournament = onSnapshot(tournamentsQuery, (snapshot) => {
      if (!isMounted.current) return;

      if (snapshot.empty) {
        setTournament(null);
        setGames([]);
        setIsLoading(false);
        return;
      }

      const tournamentData = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Tournament;

      setTournament(tournamentData);

      const gamesQuery = collection(db, 'tournaments', tournamentData.id, 'games');
      const unsubscribeGames = onSnapshot(gamesQuery, (gamesSnapshot) => {
        if (!isMounted.current) return;

        const gamesData = gamesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
        setGames(gamesData);
        setIsLoading(false);
      }, (error) => {
        if (!isMounted.current) return;
        console.error('Error fetching games:', error);
        setError('Failed to load games');
        setIsLoading(false);
      });

      unsubscribeRef.current = () => {
        unsubscribeTournament();
        unsubscribeGames();
      };
    }, (error) => {
      console.error('Error fetching tournament:', error);
      setError('Failed to load tournament');
      setIsLoading(false);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!games) return;

    if (activeStatus === 'all') {
      setFilteredGames(games);
    } else {
      setFilteredGames(games.filter(game => game.status === activeStatus));
    }
  }, [games, activeStatus]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!tournament) {
    return <div>No active tournament found.</div>;
  }

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
    <div className="space-y-8 py-2">
      <div className="flex items-center justify-between">
        <ScoreCard
          currentScore={tournament.totalScore ? 
            (tournament.useHandicaps ? tournament.totalScore.adjusted : tournament.totalScore.raw) 
            : { USA: 0, EUROPE: 0 }
          }
          projectedScore={tournament.projectedScore ? 
            (tournament.useHandicaps 
              ? (tournament.projectedScore.adjusted || { USA: 0, EUROPE: 0 })
              : (tournament.projectedScore.raw || { USA: 0, EUROPE: 0 }))
            : { USA: 0, EUROPE: 0 }
          }
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
        <div className="bg-black text-white rounded-lg shadow-lg p-6">
          <TournamentProgress 
            progress={tournament.progress
              .filter(p => p && p.score)
              .map(p => ({
                timestamp: new Date(p.timestamp),
                score: tournament.useHandicaps 
                  ? p.score.adjusted
                  : p.score.raw,
                projectedScore: tournament.useHandicaps
                  ? p.projectedScore?.adjusted
                  : p.projectedScore?.raw,
                completedGames: p.completedGames
              }))}
            totalGames={games.length}
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Games</h2>
          <StatusFilter activeStatus={activeStatus} onStatusChange={setActiveStatus} />
        </div>
        <GameList 
          games={filteredGames}
          showStatusFilter={false}
          showControls={false}
          isAdmin={false}
          isOnline={isOnline}
          useHandicaps={tournament.useHandicaps}
          tournamentSettings={{
            id: tournament.id,
            useHandicaps: tournament.useHandicaps,
            handicapStrokes: tournament.handicapStrokes,
            higherHandicapTeam: tournament.higherHandicapTeam
          }}
          linkedPlayerId={null}
          onGameStatusChange={async () => {}}
        />
      </div>
    </div>
  );
}