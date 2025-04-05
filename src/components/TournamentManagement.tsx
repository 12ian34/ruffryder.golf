import { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import MatchupCreator from './tournament/MatchupCreator';
import MatchupList from './tournament/MatchupList';
import type { Player } from '../types/player';
import type { Game } from '../types/game';
import type { Tournament, TeamConfig, Matchup } from '../types/tournament';
import { auth } from '../config/firebase';
import { toast } from 'react-hot-toast';

interface NewTournamentForm {
  name: string;
  year: number;
  useHandicaps: boolean;
  teamConfig: TeamConfig;
}

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedUsaPlayer, setSelectedUsaPlayer] = useState('');
  const [selectedEuropePlayer, setSelectedEuropePlayer] = useState('');
  const [currentMatchups, setCurrentMatchups] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTournament, setNewTournament] = useState<NewTournamentForm>({
    name: '',
    year: new Date().getFullYear(),
    useHandicaps: false,
    teamConfig: 'USA_VS_EUROPE'
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentsSnapshot, playersSnapshot] = await Promise.all([
          getDocs(collection(db, 'tournaments')),
          getDocs(collection(db, 'players'))
        ]);

        const tournamentsData = tournamentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            year: data.year || new Date().getFullYear(),
            isActive: data.isActive || false,
            useHandicaps: data.useHandicaps || false,
            teamConfig: data.teamConfig || 'USA_VS_EUROPE',
            totalScore: data.totalScore || {
              raw: { USA: 0, EUROPE: 0 },
              adjusted: { USA: 0, EUROPE: 0 }
            },
            projectedScore: data.projectedScore || {
              raw: { USA: 0, EUROPE: 0 },
              adjusted: { USA: 0, EUROPE: 0 }
            },
            progress: data.progress || [],
            matchups: data.matchups || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          } as Tournament;
        });

        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];

        setTournaments(tournamentsData);
        setPlayers(playersData);

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
          setLastUpdated(Date.now()); // Update timestamp after data fetch
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

  useEffect(() => {
    if (!selectedTournament) return;

    // Set up real-time listener for games
    const unsubscribe = onSnapshot(
      collection(db, 'tournaments', selectedTournament.id, 'games'),
      (snapshot) => {
        const matchupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
        
        // Update currentMatchups with the latest game data
        setCurrentMatchups(matchupsData);
        
        // Update selectedTournament's matchups array to match the games
        setSelectedTournament(prev => {
          if (!prev) return null;
          
          // Create new matchups array from games data
          const newMatchups = matchupsData.map(game => ({
            id: game.id,
            usaPlayerId: game.usaPlayerId,
            europePlayerId: game.europePlayerId,
            usaPlayerName: game.usaPlayerName,
            europePlayerName: game.europePlayerName,
            status: game.status === 'complete' ? 'completed' as const 
              : game.status === 'in_progress' ? 'in_progress' as const 
              : 'pending' as const,
            handicapStrokes: game.handicapStrokes
          }));

          return {
            ...prev,
            matchups: newMatchups // Replace entire matchups array
          };
        });
      },
      (error) => {
        console.error('Error in games listener:', error);
        toast.error('Failed to get real-time game updates');
      }
    );

    return () => unsubscribe();
  }, [selectedTournament?.id]);

  const handleCreateTournament = async () => {
    if (!newTournament.name || !newTournament.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const tournament: Omit<Tournament, 'id'> = {
        name: newTournament.name,
        year: newTournament.year,
        isActive: false,
        useHandicaps: newTournament.useHandicaps,
        teamConfig: newTournament.teamConfig,
        handicapStrokes: 0,
        higherHandicapTeam: 'USA',
        totalScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        projectedScore: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        progress: [],
        matchups: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // First, deactivate any currently active tournament
      const activeTournament = tournaments.find(t => t.isActive);
      if (activeTournament) {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), {
          isActive: false
        });
      }

      // Create the new tournament
      const docRef = await addDoc(collection(db, 'tournaments'), tournament);

      // Update local state with the Firestore document ID
      const tournamentWithId = {
        ...tournament,
        id: docRef.id
      };

      setTournaments(prev => [...prev, tournamentWithId]);
      setSelectedTournament(tournamentWithId);

      // Reset form
      setNewTournament({
        name: '',
        year: new Date().getFullYear(),
        useHandicaps: false,
        teamConfig: 'USA_VS_EUROPE'
      });

      toast.success('Tournament created successfully');
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatchup = async () => {
    if (!selectedTournament || !selectedUsaPlayer || !selectedEuropePlayer) return;

    setIsLoading(true);
    try {
      let player1Name = '', player2Name = '';
      let player1Id = selectedUsaPlayer, player2Id = selectedEuropePlayer;
      let team1: 'USA' | 'EUROPE' = 'USA';
      let team2: 'USA' | 'EUROPE' = 'EUROPE';
      
      switch (selectedTournament.teamConfig) {
        case 'USA_VS_EUROPE':
          player1Name = availableUsaPlayers.find(p => p.id === selectedUsaPlayer)?.name || '';
          player2Name = availableEuropePlayers.find(p => p.id === selectedEuropePlayer)?.name || '';
          break;
        case 'EUROPE_VS_EUROPE':
          player1Name = availableEuropePlayers.find(p => p.id === selectedUsaPlayer)?.name || '';
          player2Name = availableEuropePlayers.find(p => p.id === selectedEuropePlayer)?.name || '';
          team1 = 'EUROPE';
          team2 = 'EUROPE';
          break;
        case 'USA_VS_USA':
          player1Name = availableUsaPlayers.find(p => p.id === selectedUsaPlayer)?.name || '';
          player2Name = availableUsaPlayers.find(p => p.id === selectedEuropePlayer)?.name || '';
          team1 = 'USA';
          team2 = 'USA';
          break;
      }

      // Calculate handicap strokes if enabled
      let handicapStrokes = 0;
      let higherHandicapTeam: 'USA' | 'EUROPE' = 'USA';
      if (selectedTournament.useHandicaps) {
        handicapStrokes = calculateHandicapDifference(player1Id, player2Id);
        const player1 = availableUsaPlayers.find(p => p.id === player1Id) || availableEuropePlayers.find(p => p.id === player1Id);
        const player2 = availableUsaPlayers.find(p => p.id === player2Id) || availableEuropePlayers.find(p => p.id === player2Id);
        
        if (player1 && player2) {
          higherHandicapTeam = player1.averageScore > player2.averageScore ? team1 : team2;
        }
      }

      // Fetch stroke indices from config
      const strokeIndicesDoc = await getDoc(doc(db, 'config', 'strokeIndices'));
      const strokeIndices = strokeIndicesDoc.data()?.indices || Array(18).fill(0);

      // Create the game document
      const game: Game = {
        id: '', // We'll get this from Firestore
        tournamentId: selectedTournament.id,
        usaPlayerId: player1Id,
        usaPlayerName: player1Name,
        europePlayerId: player2Id,
        europePlayerName: player2Name,
        handicapStrokes,
        higherHandicapTeam,
        holes: Array(18).fill(null).map((_, index) => ({
          holeNumber: index + 1,
          strokeIndex: strokeIndices[index] || 0,
          parScore: 4, // Default par score
          usaPlayerScore: null,
          europePlayerScore: null,
          usaPlayerAdjustedScore: null,
          europePlayerAdjustedScore: null,
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 0,
          usaPlayerMatchPlayAdjustedScore: 0,
          europePlayerMatchPlayAdjustedScore: 0
        })),
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
        points: {
          raw: { USA: 0, EUROPE: 0 },
          adjusted: { USA: 0, EUROPE: 0 }
        },
        isComplete: false,
        isStarted: false,
        playerIds: [player1Id, player2Id],
        status: 'not_started'
      };

      // Add the game to the games subcollection
      const gameDocRef = await addDoc(collection(db, 'tournaments', selectedTournament.id, 'games'), game);

      // Update the game with its ID
      const gameWithId = { ...game, id: gameDocRef.id };
      await updateDoc(gameDocRef, { id: gameDocRef.id });

      // Create the matchup object
      const matchup: Matchup = {
        id: gameDocRef.id, // Use the same ID as the game
        usaPlayerId: player1Id,
        europePlayerId: player2Id,
        usaPlayerName: player1Name,
        europePlayerName: player2Name,
        status: 'pending',
        handicapStrokes
      };

      // Update the tournament document with the new matchup
      const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
      await updateDoc(tournamentRef, {
        matchups: arrayUnion(matchup)
      });

      // Update local state with the new game
      setCurrentMatchups(prev => [...prev, gameWithId]);

      // Reset player selection
      setSelectedUsaPlayer('');
      setSelectedEuropePlayer('');

      showSuccessToast('Matchup created successfully');
    } catch (err: any) {
      showErrorToast('Failed to create matchup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (tournament: Tournament) => {
    try {
      setIsLoading(true);
      
      // If trying to activate a tournament, first deactivate any currently active tournament
      if (!tournament.isActive) {
        const activeTournament = tournaments.find(t => t.isActive);
        if (activeTournament) {
          await updateDoc(doc(db, 'tournaments', activeTournament.id), {
            isActive: false
          });
        }
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

      // If activating the tournament, fetch its matchups
      if (!tournament.isActive) {
        // First set the selected tournament
        setSelectedTournament(tournament);
        
        // Then fetch the matchups
        const matchupsSnapshot = await getDocs(
          collection(db, 'tournaments', tournament.id, 'games')
        );
        const matchupsData = matchupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
        
        // Update the current matchups
        setCurrentMatchups(matchupsData);
        
        // Update the tournament's matchups array with the fetched games
        const updatedTournament: Tournament = {
          ...tournament,
          matchups: matchupsData.map(game => ({
            id: game.id,
            usaPlayerId: game.usaPlayerId,
            europePlayerId: game.europePlayerId,
            usaPlayerName: game.usaPlayerName,
            europePlayerName: game.europePlayerName,
            status: game.isComplete ? 'completed' as const : game.isStarted ? 'in_progress' as const : 'pending' as const,
            handicapStrokes: game.handicapStrokes
          }))
        };
        
        // Update the selected tournament with the latest matchups
        setSelectedTournament(updatedTournament);
      } else {
        // If deactivating, clear the matchups
        setCurrentMatchups([]);
        setSelectedTournament(null);
      }

      showSuccessToast(`Tournament ${tournament.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      showErrorToast('Failed to update tournament status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTournament = async (tournament: Tournament) => {
    if (!isAdmin) {
      showErrorToast('You must be an admin to delete tournaments');
      return;
    }

    try {
      setIsLoading(true);

      // Delete all games in the tournament
      const gamesSnapshot = await getDocs(collection(db, 'tournaments', tournament.id, 'games'));
      const deletePromises = gamesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Delete the tournament document
      await deleteDoc(doc(db, 'tournaments', tournament.id));

      // Update local state
      setTournaments(tournaments.filter(t => t.id !== tournament.id));
      if (selectedTournament?.id === tournament.id) {
        setSelectedTournament(null);
        setCurrentMatchups([]);
      }

      showSuccessToast('Tournament deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete tournament:', err);
      showErrorToast('Failed to delete tournament');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMatchup = async (matchup: Matchup) => {
    if (!selectedTournament) return;

    try {
      setIsLoading(true);

      // Validate that we have both IDs
      if (!matchup.id || !selectedTournament.id) {
        throw new Error('Missing required IDs for deletion');
      }

      // Create the reference to the game document in the games subcollection
      const gamesCollectionRef = collection(db, 'tournaments', selectedTournament.id, 'games');
      const gameDocRef = doc(gamesCollectionRef, matchup.id);

      // Delete the game document
      await deleteDoc(gameDocRef);

      // Update the tournament document to remove the matchup
      const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
      const updatedMatchups = selectedTournament.matchups.filter(m => m.id !== matchup.id);

      await updateDoc(tournamentRef, {
        matchups: updatedMatchups
      });

      // Update local state for both tournament and currentMatchups
      setSelectedTournament(prev => prev ? {
        ...prev,
        matchups: updatedMatchups
      } : null);
      setCurrentMatchups(prev => prev.filter(m => m.id !== matchup.id));
      
      // Force a re-render by updating lastUpdated
      setLastUpdated(Date.now());

      toast.success('Matchup deleted successfully');
    } catch (error) {
      console.error('Error deleting matchup:', error);
      toast.error('Failed to delete matchup');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateHandicapDifference = (player1Id: string, player2Id: string): number => {
    const player1 = availableUsaPlayers.find(p => p.id === player1Id) || availableEuropePlayers.find(p => p.id === player1Id);
    const player2 = availableUsaPlayers.find(p => p.id === player2Id) || availableEuropePlayers.find(p => p.id === player2Id);
    
    if (!player1 || !player2) return 0;
    return Math.abs(player1.averageScore - player2.averageScore);
  };

  const handleToggleHandicaps = async (tournament: Tournament) => {
    try {
      const newUseHandicaps = !tournament.useHandicaps;
      
      // Show confirmation dialog
      const message = newUseHandicaps
        ? "Enable handicaps for this tournament? This will adjust scores based on player handicaps."
        : "Disable handicaps for this tournament? This will show raw scores only.";
        
      if (!window.confirm(message)) {
        return;
      }

      const tournamentRef = doc(db, 'tournaments', tournament.id);

      // Update tournament document
      await updateDoc(tournamentRef, {
        useHandicaps: newUseHandicaps,
        updatedAt: serverTimestamp()
      });

      // Update local state for tournaments
      setTournaments(prev => prev.map(t => 
        t.id === tournament.id 
          ? { ...t, useHandicaps: newUseHandicaps }
          : t
      ));

      // If this is the selected tournament, update it
      if (selectedTournament?.id === tournament.id) {
        setSelectedTournament(prev => prev ? { ...prev, useHandicaps: newUseHandicaps } : null);
      }

      // Force a re-render
      setLastUpdated(Date.now());
      
      setIsLoading(false);
      toast.success(`Handicaps ${newUseHandicaps ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling handicaps:', error);
      toast.error('Failed to update handicap settings');
      throw error;
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
  const availableUsaPlayers = (selectedTournament?.teamConfig === 'USA_VS_EUROPE' || selectedTournament?.teamConfig === 'USA_VS_USA')
    ? players
        .filter(p => p.team === 'USA')
        .filter(p => !currentMatchups.some(m => m.usaPlayerId === p.id || m.europePlayerId === p.id))
    : [];

  const availableEuropePlayers = selectedTournament?.teamConfig === 'EUROPE_VS_EUROPE'
    ? players
        .filter(p => p.team === 'EUROPE')
        .filter(p => !currentMatchups.some(m => m.usaPlayerId === p.id || m.europePlayerId === p.id))
    : selectedTournament?.teamConfig === 'USA_VS_EUROPE'
      ? players
          .filter(p => p.team === 'EUROPE')
          .filter(p => !currentMatchups.some(m => m.europePlayerId === p.id))
      : [];

  return (
    <div className="space-y-6" key={lastUpdated}>
      {/* Tournament Selection/Creation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Tournament Setup</h2>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(prev => !prev)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              {showCreateForm ? 'Cancel' : 'Create New Tournament'}
            </button>
          )}
        </div>

        {isAdmin && showCreateForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter tournament name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={newTournament.year}
                  onChange={(e) => setNewTournament({ ...newTournament, year: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team Configuration
                </label>
                <select
                  value={newTournament.teamConfig}
                  onChange={(e) => setNewTournament({ ...newTournament, teamConfig: e.target.value as TeamConfig })}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="USA_VS_EUROPE">USA vs Europe</option>
                  <option value="EUROPE_VS_EUROPE">Europe vs Europe</option>
                  <option value="USA_VS_USA">USA vs USA</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useHandicaps"
                  checked={newTournament.useHandicaps}
                  onChange={(e) => setNewTournament({ ...newTournament, useHandicaps: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="useHandicaps" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Use Handicaps
                </label>
              </div>
              <button
                onClick={handleCreateTournament}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Tournament
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={`p-6 rounded-lg ${
                tournament.isActive
                  ? 'border-2 border-blue-500 bg-gray-50 dark:bg-gray-700'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium dark:text-white">
                  {tournament.name}
                </h3>
                {isAdmin && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        const firstConfirm = window.confirm(`Are you sure you want to delete the tournament "${tournament.name}"?`);
                        if (firstConfirm) {
                          const secondConfirm = window.confirm(`⚠️ FINAL WARNING: This will permanently delete all games and data for "${tournament.name}". This action cannot be undone.`);
                          if (secondConfirm) {
                            handleDeleteTournament(tournament);
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-150"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                    <div className="absolute hidden group-hover:block w-48 p-2 bg-gray-800 text-xs text-gray-300 rounded shadow-lg -bottom-12 right-0">
                      Double confirmation required
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div>Year: {tournament.year}</div>
                <div>Team Config: {tournament.teamConfig}</div>
                <div>Status: {tournament.isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {tournament.isActive && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleHandicaps(tournament)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        tournament.useHandicaps ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={tournament.useHandicaps}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          tournament.useHandicaps ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Handicaps
                      </span>
                      <span className="text-xs text-gray-500">
                        {tournament.useHandicaps ? 'Adjusted scores' : 'Raw scores'}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleToggleActive(tournament)}
                  className={`px-4 py-2 rounded-lg ${
                    tournament.isActive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white text-sm`}
                >
                  {tournament.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTournament && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MatchupCreator
            availableUsaPlayers={availableUsaPlayers}
            availableEuropePlayers={availableEuropePlayers}
            selectedUsaPlayer={selectedUsaPlayer}
            selectedEuropePlayer={selectedEuropePlayer}
            onUsaPlayerSelect={setSelectedUsaPlayer}
            onEuropePlayerSelect={setSelectedEuropePlayer}
            onCreateMatchup={handleCreateMatchup}
            isLoading={isLoading}
            teamConfig={selectedTournament.teamConfig}
          />
          <MatchupList
            key={`matchup-list-${selectedTournament.id}`}
            matchups={selectedTournament.matchups}
            currentMatchups={currentMatchups}
            teamConfig={selectedTournament.teamConfig}
            onDeleteMatchup={handleDeleteMatchup}
            isAdmin={true}
            useHandicaps={selectedTournament.useHandicaps}
          />
        </div>
      )}
    </div>
  );
}