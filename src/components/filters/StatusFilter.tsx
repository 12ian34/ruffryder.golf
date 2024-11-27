import { GameStatus } from '../../types/game';

interface StatusFilterProps {
  activeStatus: GameStatus;
  onStatusChange: (status: GameStatus) => void;
}

export default function StatusFilter({ activeStatus, onStatusChange }: StatusFilterProps) {
  return (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => onStatusChange('all')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'all'
            ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        All Games
      </button>
      <button
        onClick={() => onStatusChange('complete')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'complete'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/50'
        }`}
      >
        Completed
      </button>
      <button
        onClick={() => onStatusChange('in_progress')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeStatus === 'in_progress'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
        }`}
      >
        In Progress
      </button>
      <button
        onClick={() => onStatusChange('not_started')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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