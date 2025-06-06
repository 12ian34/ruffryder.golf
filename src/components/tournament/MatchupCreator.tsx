import type { Player } from '../../types/player';
import type { TeamConfig } from '../../types/tournament';

interface MatchupCreatorProps {
  availableUsaPlayers: Player[];
  availableEuropePlayers: Player[];
  selectedUsaPlayer: string;
  selectedEuropePlayer: string;
  onUsaPlayerSelect: (playerId: string) => void;
  onEuropePlayerSelect: (playerId: string) => void;
  onCreateMatchup: () => Promise<void>;
  isLoading: boolean;
  teamConfig: TeamConfig;
}

export default function MatchupCreator({
  availableUsaPlayers,
  availableEuropePlayers,
  selectedUsaPlayer,
  selectedEuropePlayer,
  onUsaPlayerSelect,
  onEuropePlayerSelect,
  onCreateMatchup,
  isLoading,
  teamConfig
}: MatchupCreatorProps) {
  const renderPlayerSelectors = () => {
    switch (teamConfig) {
      case 'USA_VS_EUROPE':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                USA Player
              </label>
              <select
                value={selectedUsaPlayer}
                onChange={(e) => onUsaPlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select USA Player</option>
                {availableUsaPlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
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
                onChange={(e) => onEuropePlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Europe Player</option>
                {availableEuropePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
                  </option>
                ))}
              </select>
            </div>
          </>
        );
      case 'EUROPE_VS_EUROPE':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Europe Player 1
              </label>
              <select
                value={selectedUsaPlayer}
                onChange={(e) => onUsaPlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Europe Player 1</option>
                {availableEuropePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Europe Player 2
              </label>
              <select
                value={selectedEuropePlayer}
                onChange={(e) => onEuropePlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Europe Player 2</option>
                {availableEuropePlayers
                  .filter(p => p.id !== selectedUsaPlayer)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
                    </option>
                  ))}
              </select>
            </div>
          </>
        );
      case 'USA_VS_USA':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                USA Player 1
              </label>
              <select
                value={selectedUsaPlayer}
                onChange={(e) => onUsaPlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select USA Player 1</option>
                {availableUsaPlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                USA Player 2
              </label>
              <select
                value={selectedEuropePlayer}
                onChange={(e) => onEuropePlayerSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select USA Player 2</option>
                {availableUsaPlayers
                  .filter(p => p.id !== selectedUsaPlayer)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Tier: {player.tier ?? 'N/A'}, Avg: {player.averageScore})
                    </option>
                  ))}
              </select>
            </div>
          </>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Create Matchup</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderPlayerSelectors()}
      </div>
      <button
        onClick={onCreateMatchup}
        disabled={!selectedUsaPlayer || !selectedEuropePlayer || isLoading}
        className="mt-4 w-full bg-gradient-to-br from-europe-500 to-europe-600 text-white py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating...
          </span>
        ) : (
          'Create Matchup'
        )}
      </button>
    </div>
  );
}