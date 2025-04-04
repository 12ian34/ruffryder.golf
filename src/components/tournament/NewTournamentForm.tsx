import { useState } from 'react';
import type { TeamConfig } from '../../types/tournament';

interface NewTournamentFormProps {
  onSubmit: (name: string, year: number, teamConfig: TeamConfig) => Promise<void>;
  isLoading: boolean;
}

export default function NewTournamentForm({ onSubmit, isLoading }: NewTournamentFormProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [teamConfig, setTeamConfig] = useState<TeamConfig>('USA_VS_EUROPE');

  const handleSubmit = async () => {
    await onSubmit(name, year, teamConfig);
    setName('');
  };

  return (
    <div className="border-t dark:border-gray-700 pt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Create New Tournament
      </h4>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tournament Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Spring Tournament"
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team Configuration
          </label>
          <select
            value={teamConfig}
            onChange={(e) => setTeamConfig(e.target.value as TeamConfig)}
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="USA_VS_EUROPE">USA vs Europe</option>
            <option value="EUROPE_VS_EUROPE">Europe vs Europe</option>
            <option value="USA_VS_USA">USA vs USA</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading || !name.trim()}
      >
        Create New Tournament
      </button>
    </div>
  );
}