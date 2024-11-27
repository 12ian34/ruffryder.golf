import type { Player } from '../../types/player';

interface MatchupCreatorProps {
  availableUsaPlayers: Player[];
  availableEuropePlayers: Player[];
  selectedUsaPlayer: string;
  selectedEuropePlayer: string;
  onUsaPlayerSelect: (playerId: string) => void;
  onEuropePlayerSelect: (playerId: string) => void;
  onCreateMatchup: () => Promise<void>;
  isLoading: boolean;
}

export default function MatchupCreator({
  availableUsaPlayers,
  availableEuropePlayers,
  selectedUsaPlayer,
  selectedEuropePlayer,
  onUsaPlayerSelect,
  onEuropePlayerSelect,
  onCreateMatchup,
  isLoading
}: MatchupCreatorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Create Matchup</h3>
      <div className="grid grid-cols-2 gap-4">
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
            onChange={(e) => onEuropePlayerSelect(e.target.value)}
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
        onClick={onCreateMatchup}
        disabled={!selectedUsaPlayer || !selectedEuropePlayer || isLoading}
        className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Matchup
      </button>
    </div>
  );
}