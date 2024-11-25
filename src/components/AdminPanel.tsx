import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { importHistoricalScores } from '../utils/importScores';
import TournamentManagement from './TournamentManagement';
import StrokeIndexManagement from './StrokeIndexManagement';
import UserManagement from './UserManagement';
import PlayerManagement from './PlayerManagement';

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<'scores' | 'tournament' | 'strokeIndex' | 'users' | 'players'>('scores');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastImportDate, setLastImportDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchLastImportDate = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'historicalScores'));
        if (configDoc.exists() && configDoc.data().lastImportDate) {
          setLastImportDate(configDoc.data().lastImportDate.toDate());
        }
      } catch (err) {
        console.error('Error fetching last import date:', err);
      }
    };

    fetchLastImportDate();
  }, []);

  const handleImportScores = async () => {
    if (!confirm('This will import all historical scores. Are you sure you want to proceed?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await importHistoricalScores();
      
      // Update last import date
      const now = new Date();
      await updateDoc(doc(db, 'config', 'historicalScores'), {
        lastImportDate: now
      });
      setLastImportDate(now);
      
      setSuccessMessage('Historical scores imported successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error importing scores:', error);
      setError('Failed to import scores. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Pills - Now scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 min-w-max pb-3 sm:pb-0">
          <button
            onClick={() => setActiveSection('scores')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeSection === 'scores'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Historical Scores
          </button>
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
        </div>
      </div>

      {/* Content Area - Now properly contained */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 max-w-full overflow-x-hidden">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {activeSection === 'scores' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold dark:text-white">Manage Historical Scores</h2>
                {lastImportDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Last imported: {lastImportDate.toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleImportScores}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? 'Importing...' : 'Import All Scores'}
              </button>
            </div>
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
      </div>
    </div>
  );
}