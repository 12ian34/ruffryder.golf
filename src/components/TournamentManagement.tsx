import { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TournamentSelector from './tournament/TournamentSelector';
import NewTournamentForm from './tournament/NewTournamentForm';
import MatchupCreator from './tournament/MatchupCreator';
import MatchupList from './tournament/MatchupList';
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
        showErrorToast('Failed to load tournament data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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
        totalScore: { USA: 0, EUROPE: 0 },
        projectedScore: { USA: 0, EUROPE: 0 }
      });

      const newTournament = {
        id: tournamentRef.id,
        name: name.trim(),
        year,
        isActive: true,
        totalScore: { USA: 0, EUROPE: 0 },
        projectedScore: { USA: 0, EUROPE: 0 }
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
        strokePlayScore: { USA: 0, EUROPE: 0 },
        matchPlayScore: { USA: 0, EUROPE: 0 },
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
        strokePlayScore: { USA: 0, EUROPE: 0 },
        matchPlayScore: { USA: 0, EUROPE: 0 },
        isComplete: false,
        isStarted: false,
        playerIds: [selectedUsaPlayer, selectedEuropePlayer]
      };

      setCurrentMatchups([...currentMatchups, newGame]);
      setSelectedUsaPlayer('');
      setSelectedEuropePlayer('');
      showSuccessToast('Matchup created successfully!');
    } catch (err: any) {
      showErrorToast('Failed to create matchup');
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
          <TournamentSelector
            tournaments={tournaments}
            selectedTournament={selectedTournament}
            onSelect={setSelectedTournament}
          />

          <NewTournamentForm
            onSubmit={handleCreateTournament}
            isLoading={isLoading}
          />
        </div>
      </div>

      {selectedTournament && (
        <>
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
            players={players}
          />
        </>
      )}
    </div>
  );
}