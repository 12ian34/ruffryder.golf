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
            ? 'bg-usa-100 text-usa-800 dark:bg-usa-900/30 dark:text-usa-200'
            : 'text-usa-600 hover:bg-usa-50 dark:text-usa-400 dark:hover:bg-usa-900/20'
        }`}
      >
        USA
      </button>
      <button
        onClick={() => handleTeamChange('EUROPE')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeTeam === 'EUROPE'
            ? 'bg-europe-100 text-europe-800 dark:bg-europe-900/30 dark:text-europe-200'
            : 'text-europe-600 hover:bg-europe-50 dark:text-europe-400 dark:hover:bg-europe-900/20'
        }`}
      >
        Europe
      </button>
    </div>
  );
}