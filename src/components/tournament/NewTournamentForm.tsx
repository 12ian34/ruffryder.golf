import { useState } from 'react';

interface NewTournamentFormProps {
  onSubmit: (name: string, year: number) => Promise<void>;
  isLoading: boolean;
}

export default function NewTournamentForm({ onSubmit, isLoading }: NewTournamentFormProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const handleSubmit = async () => {
    await onSubmit(name, year);
    setName('');
  };

  return (
    <div className="border-t dark:border-gray-700 pt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Create New Tournament
      </h4>
      <div className="grid grid-cols-2 gap-4">
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