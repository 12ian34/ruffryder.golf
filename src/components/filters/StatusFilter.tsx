import { GameStatus } from '../../types/game';

interface StatusFilterProps {
  activeStatus: GameStatus;
  onStatusChange: (status: GameStatus) => void;
}

export default function StatusFilter({ activeStatus, onStatusChange }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onStatusChange('all')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'all'
            ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        All
      </button>
      <button
        onClick={() => onStatusChange('complete')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'complete'
            ? 'bg-usa-100 text-usa-800 dark:bg-usa-900 dark:text-usa-200'
            : 'text-usa-600 hover:bg-usa-50 dark:text-usa-400 dark:hover:bg-usa-900/50'
        }`}
      >
        Complete
      </button>
      <button
        onClick={() => onStatusChange('in_progress')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'in_progress'
            ? 'bg-europe-100 text-europe-800 dark:bg-europe-900 dark:text-europe-200'
            : 'text-europe-600 hover:bg-europe-50 dark:text-europe-400 dark:hover:bg-europe-900/50'
        }`}
      >
        In Progress
      </button>
      <button
        onClick={() => onStatusChange('not_started')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'not_started'
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
        }`}
      >
        Not Started
      </button>
    </div>
  );
}