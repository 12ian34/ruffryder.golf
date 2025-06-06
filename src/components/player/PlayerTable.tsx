import type { Player } from '../../types/player';

type SortField = 'name' | 'team' | 'averageScore' | 'tier' | number;
type SortDirection = 'asc' | 'desc';

interface PlayerTableProps {
  players: Player[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (player: Player) => void;
  onDelete: (playerId: string) => void;
}

export default function PlayerTable({
  players,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete
}: PlayerTableProps) {
  const years = Array.from(
    new Set(
      players.flatMap(p => p.historicalScores.map(s => s.year))
    )
  ).sort((a, b) => b - a);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th 
              onClick={() => onSort('name')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
            >
              Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => onSort('team')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
            >
              Team {sortField === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => onSort('tier')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
            >
              Tier {sortField === 'tier' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => onSort('averageScore')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
            >
              Average {sortField === 'averageScore' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            {years.map(year => (
              <th 
                key={year}
                onClick={() => onSort(year)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                {year} {sortField === year && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {players.map((player) => (
            <tr key={player.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-medium dark:text-white">{player.name}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  player.team === 'USA'
                    ? 'bg-usa-100 text-usa-800 dark:bg-usa-900/30 dark:text-usa-200'
                    : 'bg-europe-100 text-europe-800 dark:bg-europe-900/30 dark:text-europe-200'
                }`}>
                  {player.team}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {player.tier || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {player.averageScore}
              </td>
              {years.map(year => (
                <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {player.historicalScores.find(s => s.year === year)?.score || '-'}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-4">
                <button
                  onClick={() => onEdit(player)}
                  className="text-europe-600 hover:text-europe-700 dark:text-europe-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(player.id)}
                  className="text-usa-600 hover:text-usa-700 dark:text-usa-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}