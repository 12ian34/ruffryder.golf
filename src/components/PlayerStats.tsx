import { usePlayerStats } from '../hooks/usePlayerStats';
import PlayerEmoji from './PlayerEmoji';
import TeamFilter from './player/TeamFilter';
import TournamentFunStats from './TournamentFunStats';
import { useEffect, useRef, useState } from 'react';

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftGradient(scrollLeft > 0);
      setShowRightGradient(scrollLeft < scrollWidth - clientWidth);
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [players]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading player statistics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <TournamentFunStats />

      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Player Details</h2>
        <TeamFilter onFilterChange={setTeamFilter} />

        {players.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No players found matching the current filter.</p>
        ) : (
          <div className="relative mt-4">
            {showLeftGradient && (
              <div className="absolute top-0 left-0 bottom-0 w-12 pointer-events-none bg-gradient-to-r from-black/15 dark:from-white/10 to-transparent z-10 md:hidden" />
            )}
            {showRightGradient && (
              <div className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none bg-gradient-to-l from-black/15 dark:from-white/10 to-transparent z-10 md:hidden" />
            )}
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto"
            >
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
                      Handicap {sortField === 'averageScore' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {players.map((player) => {
                    const isCurrentPlayer = player.id === linkedPlayerId;
                    return (
                      <tr key={player.id} className={isCurrentPlayer ? 'bg-amber-50 dark:bg-purple-900/20' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <PlayerEmoji
                              playerId={player.id}
                              name={player.name}
                              customEmoji={player.customEmoji}
                              size="sm"
                            />
                            <span className={`font-medium ${
                              player.team === 'USA' ? 'text-usa-500' : 'text-europe-500'
                            }`}>
                              {player.name}
                              {isCurrentPlayer && (
                                <span className="ml-2 text-xs bg-europe-100 dark:bg-europe-800 text-europe-800 dark:text-europe-200 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            player.team === 'USA'
                              ? 'bg-usa-100 text-usa-800 dark:bg-usa-900 dark:text-usa-200'
                              : 'bg-europe-100 text-europe-800 dark:bg-europe-900 dark:text-europe-200'
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
        )}
      </div>
    </div>
  );
}