import { useEffect, useState } from 'react';
import type { Matchup } from '../../types/tournament';
import type { Game } from '../../types/game';
import type { Player } from '../../types/player';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface MatchupListProps {
  matchups?: Matchup[];
  currentMatchups?: Game[];
  teamConfig: 'USA_VS_EUROPE' | 'EUROPE_VS_EUROPE' | 'USA_VS_USA';
  onDeleteMatchup?: (matchup: Matchup) => void;
  isAdmin?: boolean;
  useHandicaps?: boolean;
}

export default function MatchupList({ 
  matchups = [], 
  currentMatchups = [], 
  teamConfig, 
  onDeleteMatchup, 
  isAdmin = false,
  useHandicaps = false
}: MatchupListProps) {
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPlayerScores = async () => {
      setIsLoading(true);
      try {
        const playerIds = new Set<string>();
        matchups.forEach(matchup => {
          playerIds.add(matchup.usaPlayerId);
          playerIds.add(matchup.europePlayerId);
        });

        if (playerIds.size === 0) {
          setIsLoading(false);
          return;
        }

        const playersSnapshot = await getDocs(collection(db, 'players'));
        const scoresMap: Record<string, number> = {};
        
        playersSnapshot.docs.forEach(doc => {
          if (playerIds.has(doc.id)) {
            const playerData = doc.data() as Player;
            scoresMap[doc.id] = playerData.averageScore || 0;
          }
        });
        
        setPlayerScores(scoresMap);
      } catch (error) {
        console.error('Error fetching player scores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerScores();
  }, [matchups]);

  const getTeamLabel = (matchup: Matchup, playerId: string) => {
    switch (teamConfig) {
      case 'USA_VS_EUROPE':
        return playerId === matchup.usaPlayerId ? 'USA' : 'EUROPE';
      case 'EUROPE_VS_EUROPE':
        return 'EUROPE';
      case 'USA_VS_USA':
        return 'USA';
      default:
        return '';
    }
  };

  const getGameStatus = (matchup: Matchup) => {
    const game = currentMatchups.find(g => g.id === matchup.id);
    if (!game) return '⏰ not started';
    
    // First check the status field directly
    switch (game.status) {
      case 'complete':
        return '✅ completed';
      case 'in_progress':
        return '⛳️ in progress';
      case 'not_started':
        return '⏰ not started';
      default:
        // Fallback to legacy flags if status is not set
        if (game.isComplete) return '✅ completed';
        if (game.isStarted) return '⛳️ in progress';
        return '⏰ not started';
    }
  };

  const handleDeleteWithConfirmation = (matchup: Matchup) => {
    const confirmMessage = `This will delete the matchup between ${matchup.usaPlayerName} and ${matchup.europePlayerName} including ALL THEIR GAME SCORES. Are you sure you want to continue?`;
    if (window.confirm(confirmMessage) && onDeleteMatchup) {
      onDeleteMatchup(matchup);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Current Matchups</h3>
      <div className="space-y-4">
        {matchups.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No matchups created yet
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          matchups.map((matchup) => (
            <div
              key={matchup.id || `${matchup.usaPlayerId}-${matchup.europePlayerId}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4"
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-16 sm:w-auto">
                    {getTeamLabel(matchup, matchup.usaPlayerId)}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {matchup.usaPlayerName}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Avg: {Math.round(playerScores[matchup.usaPlayerId]) || '—'})
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-16 sm:w-auto">
                    {getTeamLabel(matchup, matchup.europePlayerId)}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {matchup.europePlayerName}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Avg: {Math.round(playerScores[matchup.europePlayerId]) || '—'})
                    </span>
                  </span>
                </div>
                {useHandicaps && matchup.handicapStrokes !== undefined && matchup.handicapStrokes > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {matchup.handicapStrokes > 0 
                      ? `${matchup.usaPlayerName} gets ${matchup.handicapStrokes} stroke${matchup.handicapStrokes > 1 ? 's' : ''} added`
                      : `${matchup.europePlayerName} gets ${Math.abs(matchup.handicapStrokes)} stroke${Math.abs(matchup.handicapStrokes) > 1 ? 's' : ''} added`
                    }
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:space-x-4 mt-2 sm:mt-0 pt-2 sm:pt-0">
                <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                  {getGameStatus(matchup)}
                </span>
                {isAdmin && onDeleteMatchup && (
                  <button
                    onClick={() => handleDeleteWithConfirmation(matchup)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Delete matchup"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    <span className="sr-only sm:not-sr-only">Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}