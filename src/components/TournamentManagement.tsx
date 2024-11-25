import { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Player } from '../types/player';
import type { Game } from '../types/game';
import type { Tournament } from '../types/tournament';

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedUsaPlayer, setSelectedUsaPlayer] = useState('');
  const [selectedEuropePlayer, setSelectedEuropePlayer] = useState('');
  const [currentMatchups, setCurrentMatchups] = useState<Game[]>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newTournamentYear, setNewTournamentYear] = useState(new Date().getFullYear());
  const [newTournamentName, setNewTournamentName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentsSnapshot, playersSnapshot, strokeIndicesDoc] = await Promise.all([
          getDocs(collection(db, 'tournaments')),
          getDocs(collection(db, 'players')),
          getDoc(doc(db, 'config', 'strokeIndices'))
        ]);

        const tournamentsData = tournamentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tournament[];

        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];

        setTournaments(tournamentsData);
        setPlayers(playersData);

        if (strokeIndicesDoc.exists()) {
          setStrokeIndices(strokeIndicesDoc.data().indices);
        }

        // Set active tournament if exists
        const activeTournament = tournamentsData.find(t => t.isActive);
        if (activeTournament) {
          setSelectedTournament(activeTournament);
          // Fetch matchups for active tournament
          const matchupsSnapshot = await getDocs(
            collection(db, 'tournaments', activeTournament.id, 'games')
          );
          const matchupsData = matchupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Game[];
          setCurrentMatchups(matchupsData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim()) {
      setError('Please enter a tournament name');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Deactivate current active tournament if exists
      const activeTournament = tournaments.find(t => t.isActive);
      if (activeTournament) {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), {
          isActive: false
        });
      }

      // Create new tournament
      const tournamentRef = await addDoc(collection(db, 'tournaments'), {
        name: newTournamentName.trim(),
        year: newTournamentYear,
        isActive: true,
        totalScore: { usa: 0, europe: 0 },
        projectedScore: { usa: 0, europe: 0 }
      });

      const newTournament = {
        id: tournamentRef.id,
        name: newTournamentName.trim(),
        year: newTournamentYear,
        isActive: true,
        totalScore: { usa: 0, europe: 0 },
        projectedScore: { usa: 0, europe: 0 }
      };

      setTournaments([...tournaments, newTournament]);
      setSelectedTournament(newTournament);
      setCurrentMatchups([]);
      setNewTournamentName('');
      setSuccessMessage('Tournament created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatchup = async () => {
    if (!selectedTournament || !selectedUsaPlayer || !selectedEuropePlayer) {
      setError('Please select both players');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const usaPlayer = players.find(p => p.id === selectedUsaPlayer)!;
      const europePlayer = players.find(p => p.id === selectedEuropePlayer)!;
      
      // Calculate handicap difference
      const handicapDiff = Math.abs(usaPlayer.averageScore - europePlayer.averageScore);
      const higherHandicapTeam = usaPlayer.averageScore > europePlayer.averageScore ? 'USA' : 
                              usaPlayer.averageScore < europePlayer.averageScore ? 'EUROPE' : 
                              null;

      const gameRef = await addDoc(collection(db, 'tournaments', selectedTournament.id, 'games'), {
        usaPlayerId: selectedUsaPlayer,
        usaPlayerName: usaPlayer.name,
        europePlayerId: selectedEuropePlayer,
        europePlayerName: europePlayer.name,
        handicapStrokes: Math.round(handicapDiff),
        higherHandicapTeam,
        holes: strokeIndices.map((strokeIndex, i) => ({
          holeNumber: i + 1,
          strokeIndex,
          parScore: 3
        })),
        strokePlayScore: { usa: 0, europe: 0 },
        matchPlayScore: { usa: 0, europe: 0 },
        isComplete: false,
        isStarted: false,
        playerIds: [selectedUsaPlayer, selectedEuropePlayer]
      });

      const newGame = {
        id: gameRef.id,
        usaPlayerId: selectedUsaPlayer,
        usaPlayerName: usaPlayer.name,
        europePlayerId: selectedEuropePlayer,
        europePlayerName: europePlayer.name,
        handicapStrokes: Math.round(handicapDiff),
        higherHandicapTeam,
        holes: strokeIndices.map((strokeIndex, i) => ({
          holeNumber: i + 1,
          strokeIndex,
          parScore: 3
        })),
        strokePlayScore: { usa: 0, europe: 0 },
        matchPlayScore: { usa: 0, europe: 0 },
        isComplete: false,
        isStarted: false,
        playerIds: [selectedUsaPlayer, selectedEuropePlayer]
      };

      setCurrentMatchups([...currentMatchups, newGame]);
      setSelectedUsaPlayer('');
      setSelectedEuropePlayer('');
      setSuccessMessage('Matchup created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const usaPlayers = players.filter(p => p.team === 'USA');
  const europePlayers = players.filter(p => p.team === 'EUROPE');

  // Filter out players already in matchups
  const availableUsaPlayers = usaPlayers.filter(
    p => !currentMatchups.some(m => m.usaPlayerId === p.id)
  );
  const availableEuropePlayers = europePlayers.filter(
    p => !currentMatchups.some(m => m.europePlayerId === p.id)
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Tournament Selection/Creation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4 dark:text-white">Tournament Setup</h3>
        
        <div className="space-y-4">
          {/* Existing Tournament Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Existing Tournament
            </label>
            <select
              value={selectedTournament?.id || ''}
              onChange={(e) => {
                const tournament = tournaments.find(t => t.id === e.target.value);
                setSelectedTournament(tournament || null);
              }}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select Tournament</option>
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.year}) {tournament.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* New Tournament Creation */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Create New Tournament
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="e.g., Spring Tournament"
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={newTournamentYear}
                  onChange={(e) => setNewTournamentYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <button
              onClick={handleCreateTournament}
              className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !newTournamentName.trim()}
            >
              Create New Tournament
            </button>
          </div>
        </div>
      </div>

      {selectedTournament && (
        <>
          {/* Create Matchup */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Create Matchup</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  USA Player
                </label>
                <select
                  value={selectedUsaPlayer}
                  onChange={(e) => setSelectedUsaPlayer(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select USA Player</option>
                  {availableUsaPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Avg: {player.averageScore})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Europe Player
                </label>
                <select
                  value={selectedEuropePlayer}
                  onChange={(e) => setSelectedEuropePlayer(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Europe Player</option>
                  {availableEuropePlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Avg: {player.averageScore})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreateMatchup}
              disabled={!selectedUsaPlayer || !selectedEuropePlayer}
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Matchup
            </button>
          </div>

          {/* Current Matchups */}
          <div>
            <h3 className="text-lg font-medium mb-4 dark:text-white">Current Matchups</h3>
            <div className="space-y-4">
              {currentMatchups.map((game) => {
                const usaPlayer = players.find(p => p.id === game.usaPlayerId);
                const europePlayer = players.find(p => p.id === game.europePlayerId);
                return (
                  <div
                    key={game.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                  >
                    <div className="grid grid-cols-3 items-center">
                      <div className="text-center">
                        <div className="font-medium text-blue-500">
                          {game.usaPlayerName}
                          <div className="text-sm text-gray-500">
                            Avg: {usaPlayer?.averageScore}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        {game.handicapStrokes > 0 && game.higherHandicapTeam && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {game.isComplete ? 'Complete' : game.isStarted ? 'In Progress' : 'Not Started'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-500">
                          {game.europePlayerName}
                          <div className="text-sm text-gray-500">
                            Avg: {europePlayer?.averageScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {currentMatchups.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No matchups created yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}