import { useState } from 'react';
import TournamentManagement from './TournamentManagement';
import StrokeIndexManagement from './StrokeIndexManagement';
import UserManagement from './UserManagement';
import PlayerManagement from './PlayerManagement';
import BlogManagement from './blog/BlogManagement';

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<'tournament' | 'strokeIndex' | 'users' | 'players' | 'blog'>('tournament');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Navigation Pills - Now scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 min-w-max pb-3 sm:pb-0">
          <button
            onClick={() => setActiveSection('strokeIndex')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'strokeIndex'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Stroke Index
          </button>
          <button
            onClick={() => setActiveSection('tournament')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'tournament'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Tournament Setup
          </button>
          <button
            onClick={() => setActiveSection('players')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'players'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'users'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveSection('blog')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'blog'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Blog
          </button>
        </div>
      </div>

      {/* Content Area - Now properly contained */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 max-w-full overflow-x-hidden">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {activeSection === 'strokeIndex' && (
          <StrokeIndexManagement />
        )}

        {activeSection === 'tournament' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold dark:text-white">Tournament Setup</h2>
            <TournamentManagement />
          </div>
        )}

        {activeSection === 'players' && (
          <PlayerManagement />
        )}

        {activeSection === 'users' && (
          <UserManagement />
        )}

        {activeSection === 'blog' && (
          <BlogManagement />
        )}
      </div>
    </div>
  );
}