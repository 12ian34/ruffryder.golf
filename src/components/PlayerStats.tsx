import { usePlayerStats } from '../hooks/usePlayerStats';
import PlayerAvatar from './PlayerAvatar';
import TeamFilter from './player/TeamFilter';

export default function PlayerStats() {
  const {
    players,
    isLoading,
    error,
    sortField,
    sortDirection,
    toggleSort,
    years,
    linkedPlayerId,
    setTeamFilter
  } = usePlayerStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-white">Player Statistics</h2>

      <TeamFilter onFilterChange={setTeamFilter} />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th 
                onClick={() => toggleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Player {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => toggleSort('team')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Team {sortField === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => toggleSort('averageScore')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Average Score {sortField === 'averageScore' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {years.map(year => (
                <th 
                  key={year}
                  onClick={() => toggleSort(year)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                >
                  {year} {sortField === year && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {players.map((player) => {
              const isCurrentPlayer = player.id === linkedPlayerId;
              return (
                <tr key={player.id} className={isCurrentPlayer ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <PlayerAvatar
                        playerId={player.id}
                        name={player.name}
                        profilePicUrl={player.profilePicUrl}
                      />
                      <span className={`font-medium ${
                        player.team === 'USA' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {player.name}
                        {isCurrentPlayer && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      player.team === 'USA'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {player.team}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {player.averageScore}
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {player.historicalScores.find(s => s.year === year)?.score || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}