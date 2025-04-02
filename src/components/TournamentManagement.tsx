import { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { updateTournamentScores } from '../utils/tournamentScores';
import NewTournamentForm from './tournament/NewTournamentForm';
import MatchupCreator from './tournament/MatchupCreator';
import MatchupList from './tournament/MatchupList';
import type { Player } from '../types/player';
import type { Game } from '../types/game';
import type { Tournament } from '../types/tournament';
import { auth } from '../config/firebase';

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedUsaPlayer, setSelectedUsaPlayer] = useState('');
  const [selectedEuropePlayer, setSelectedEuropePlayer] = useState('');
  const [currentMatchups, setCurrentMatchups] = useState<Game[]>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

        const indices = strokeIndicesDoc.data()?.indices || [];
        setStrokeIndices(indices);

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
        showErrorToast('Failed to load tournament data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().isAdmin);
      }
    };
    checkAdminStatus();
  }, []);

  const handleCreateTournament = async (name: string, year: number) => {
    if (!name.trim()) {
      showErrorToast('Please enter a tournament name');
      return;
    }

    try {
      setIsLoading(true);

      // Deactivate current active tournament if exists
      const activeTournament = tournaments.find(t => t.isActive);
      if (activeTournament) {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), {
          isActive: false
        });
      }

      // Create new tournament
      const tournamentRef = await addDoc(collection(db, 'tournaments'), {
        name: name.trim(),
        year,
        isActive: true,
        useHandicaps: true,
        totalScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        projectedScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        progress: []
      });

      const newTournament = {
        id: tournamentRef.id,
        name: name.trim(),
        year,
        isActive: true,
        useHandicaps: true,
        totalScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        projectedScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        progress: []
      };

      setTournaments([...tournaments, newTournament]);
      setSelectedTournament(newTournament);
      setCurrentMatchups([]);
      showSuccessToast('Tournament created successfully!');
    } catch (err: any) {
      showErrorToast('Failed to create tournament');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatchup = async () => {
    if (!selectedTournament || !selectedUsaPlayer || !selectedEuropePlayer) {
      showErrorToast('Please select both players');
      return;
    }

    try {
      setIsLoading(true);

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
      if (!userDoc.exists() || !userDoc.data().isAdmin) {
        throw new Error('You must be an admin to create matchups');
      }

      const usaPlayer = players.find(p => p.id === selectedUsaPlayer)!;
      const europePlayer = players.find(p => p.id === selectedEuropePlayer)!;
      
      // Calculate handicap difference
      const handicapDiff = Math.abs(usaPlayer.averageScore - europePlayer.averageScore);

      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        strokeIndex: strokeIndices[i],
        parScore: 3
      }));

      const gameRef = await addDoc(collection(db, 'tournaments', selectedTournament.id, 'games'), {
        usaPlayerId: selectedUsaPlayer,
        usaPlayerName: usaPlayer.name,
        usaPlayerHandicap: usaPlayer.averageScore,
        europePlayerId: selectedEuropePlayer,
        europePlayerName: europePlayer.name,
        europePlayerHandicap: europePlayer.averageScore,
        handicapStrokes: Math.round(handicapDiff),
        higherHandicapTeam: (usaPlayer.averageScore > europePlayer.averageScore ? 'USA' : 'EUROPE') as 'USA' | 'EUROPE',
        holes,
        strokePlayScore: { 
          USA: 0, 
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 0
        },
        matchPlayScore: { 
          USA: 0, 
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 0
        },
        isComplete: false,
        isStarted: false,
        playerIds: [selectedUsaPlayer, selectedEuropePlayer]
      });

      const newGame = {
        id: gameRef.id,
        tournamentId: selectedTournament.id,
        usaPlayerId: selectedUsaPlayer,
        usaPlayerName: usaPlayer.name,
        usaPlayerHandicap: usaPlayer.averageScore,
        europePlayerId: selectedEuropePlayer,
        europePlayerName: europePlayer.name,
        europePlayerHandicap: europePlayer.averageScore,
        handicapStrokes: Math.round(handicapDiff),
        higherHandicapTeam: (usaPlayer.averageScore > europePlayer.averageScore ? 'USA' : 'EUROPE') as 'USA' | 'EUROPE',
        holes,
        strokePlayScore: { 
          USA: 0, 
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 0
        },
        matchPlayScore: { 
          USA: 0, 
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 0
        },
        isComplete: false,
        isStarted: false,
        playerIds: [selectedUsaPlayer, selectedEuropePlayer],
        useHandicaps: selectedTournament.useHandicaps
      };

      setCurrentMatchups([...currentMatchups, newGame]);
      setSelectedUsaPlayer('');
      setSelectedEuropePlayer('');
      showSuccessToast('Matchup created successfully!');
    } catch (err: any) {
      console.error('Failed to create matchup:', err);
      showErrorToast(`Failed to create matchup: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTournamentSelect = async (tournament: Tournament) => {
    try {
      setIsLoading(true);
      setSelectedTournament(tournament);
      
      // Fetch matchups for selected tournament
      const matchupsSnapshot = await getDocs(
        collection(db, 'tournaments', tournament.id, 'games')
      );
      const matchupsData = matchupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      setCurrentMatchups(matchupsData);
    } catch (err: any) {
      showErrorToast('Failed to load tournament matchups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (tournament: Tournament) => {
    try {
      setIsLoading(true);
      
      // Deactivate current active tournament if exists
      const activeTournament = tournaments.find(t => t.isActive);
      if (activeTournament && activeTournament.id !== tournament.id) {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), {
          isActive: false
        });
      }

      // Toggle active state of selected tournament
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        isActive: !tournament.isActive
      });

      // Update local state
      setTournaments(tournaments.map(t => ({
        ...t,
        isActive: t.id === tournament.id ? !t.isActive : false
      })));

      showSuccessToast(`Tournament ${tournament.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      showErrorToast('Failed to update tournament status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHandicaps = async (tournament: Tournament) => {
    try {
      setIsLoading(true);
      
      // Update tournament handicap setting
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        useHandicaps: !tournament.useHandicaps
      });

      // Update tournament scores to reflect new handicap setting
      await updateTournamentScores(tournament.id);

      // Update local state
      setTournaments(tournaments.map(t => ({
        ...t,
        useHandicaps: t.id === tournament.id ? !t.useHandicaps : t.useHandicaps
      })));

      if (selectedTournament?.id === tournament.id) {
        setSelectedTournament({
          ...selectedTournament,
          useHandicaps: !selectedTournament.useHandicaps
        });
      }

      showSuccessToast('Tournament settings updated');
    } catch (err: any) {
      showErrorToast('Failed to update tournament settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMatchup = async (gameId: string) => {
    if (!selectedTournament) return;

    try {
      setIsLoading(true);
      
      // Check if user is admin
      if (!isAdmin) {
        throw new Error('You must be an admin to delete matchups');
      }

      // Delete the game document
      await deleteDoc(doc(db, 'tournaments', selectedTournament.id, 'games', gameId));

      // Update local state
      setCurrentMatchups(currentMatchups.filter(game => game.id !== gameId));

      // Update tournament scores
      await updateTournamentScores(selectedTournament.id);

      showSuccessToast('Matchup deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete matchup:', err);
      showErrorToast(`Failed to delete matchup: ${err.message}`);
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

  // Filter out players already in matchups
  const availableUsaPlayers = players
    .filter(p => p.team === 'USA')
    .filter(p => !currentMatchups.some(m => m.usaPlayerId === p.id));

  const availableEuropePlayers = players
    .filter(p => p.team === 'EUROPE')
    .filter(p => !currentMatchups.some(m => m.europePlayerId === p.id));

  return (
    <div className="space-y-6">
      {/* Tournament Selection/Creation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4 dark:text-white">Tournament Setup</h3>
        
        <div className="space-y-4">
          <div className="grid gap-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className={`p-4 rounded-lg border ${
                  tournament.isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium dark:text-white">{tournament.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Year: {tournament.year}
                      </div>
                    </div>
                    {tournament.isActive && (
                      <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Use Handicaps</span>
                      <button
                        onClick={() => handleToggleHandicaps(tournament)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          tournament.useHandicaps ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tournament.useHandicaps ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                    <button
                      onClick={() => handleToggleActive(tournament)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        tournament.isActive
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {tournament.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleTournamentSelect(tournament)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        selectedTournament?.id === tournament.id
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {selectedTournament?.id === tournament.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <NewTournamentForm
            onSubmit={handleCreateTournament}
            isLoading={isLoading}
          />
        </div>
      </div>

      {selectedTournament && (
        <div className="space-y-6">
          <MatchupCreator
            availableUsaPlayers={availableUsaPlayers}
            availableEuropePlayers={availableEuropePlayers}
            selectedUsaPlayer={selectedUsaPlayer}
            selectedEuropePlayer={selectedEuropePlayer}
            onUsaPlayerSelect={setSelectedUsaPlayer}
            onEuropePlayerSelect={setSelectedEuropePlayer}
            onCreateMatchup={handleCreateMatchup}
            isLoading={isLoading}
          />
          <MatchupList 
            matchups={currentMatchups} 
            isAdmin={isAdmin}
            onDelete={handleDeleteMatchup}
            useHandicaps={selectedTournament.useHandicaps}
          />
        </div>
      )}
    </div>
  );
}