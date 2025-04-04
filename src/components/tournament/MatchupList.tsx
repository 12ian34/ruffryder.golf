import type { Matchup } from '../../types/tournament';
import type { Game } from '../../types/game';

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
  const getTeamLabel = (playerId: string) => {
    switch (teamConfig) {
      case 'USA_VS_EUROPE':
        return playerId === matchups[0]?.usaPlayerId ? 'USA' : 'EUROPE';
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Current Matchups</h3>
      <div className="space-y-4">
        {matchups.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No matchups created yet
          </div>
        ) : (
          matchups.map((matchup) => (
            <div
              key={matchup.id || `${matchup.usaPlayerId}-${matchup.europePlayerId}`}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {getTeamLabel(matchup.usaPlayerId)}:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {matchup.usaPlayerName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {getTeamLabel(matchup.europePlayerId)}:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {matchup.europePlayerName}
                  </span>
                </div>
                {useHandicaps && matchup.handicapStrokes !== undefined && matchup.handicapStrokes > 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {matchup.handicapStrokes > 0 
                      ? `${matchup.usaPlayerName} gets ${matchup.handicapStrokes} stroke${matchup.handicapStrokes > 1 ? 's' : ''} added`
                      : `${matchup.europePlayerName} gets ${Math.abs(matchup.handicapStrokes)} stroke${Math.abs(matchup.handicapStrokes) > 1 ? 's' : ''} added`
                    }
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getGameStatus(matchup)}
                </span>
                {isAdmin && onDeleteMatchup && (
                  <button
                    onClick={() => onDeleteMatchup(matchup)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Delete
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