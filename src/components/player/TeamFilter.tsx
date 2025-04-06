import { useState } from 'react';

interface TeamFilterProps {
  onFilterChange: (team: 'ALL' | 'USA' | 'EUROPE') => void;
}

export default function TeamFilter({ onFilterChange }: TeamFilterProps) {
  const [activeTeam, setActiveTeam] = useState<'ALL' | 'USA' | 'EUROPE'>('ALL');

  const handleTeamChange = (team: 'ALL' | 'USA' | 'EUROPE') => {
    setActiveTeam(team);
    onFilterChange(team);
  };

  return (
    <div className="flex space-x-2 mb-6">
      <button
        onClick={() => handleTeamChange('ALL')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeTeam === 'ALL'
            ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        All Players
      </button>
      <button
        onClick={() => handleTeamChange('USA')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeTeam === 'USA'
            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50'
        }`}
      >
        USA
      </button>
      <button
        onClick={() => handleTeamChange('EUROPE')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeTeam === 'EUROPE'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            : 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/50'
        }`}
      >
        Europe
      </button>
    </div>
  );
}