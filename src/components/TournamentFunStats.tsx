import React from 'react';
import { useTournamentStats } from '../hooks/useTournamentStats';
import { generateFunFacts } from '../utils/statsAnalysis';

// No props needed for now as the hook fetches active tournament data
interface TournamentFunStatsProps {}

const TournamentFunStats: React.FC<TournamentFunStatsProps> = () => {
  const { analyzableData, isLoading, error } = useTournamentStats();

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Fun Tournament Facts!</h2>
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow mb-6" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // analyzableData could be null if no active tournament or if there was an issue handled gracefully by the hook
  const funFacts = analyzableData ? generateFunFacts(analyzableData) : ["Waiting for tournament data..."];

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">highlights</h2>
      {funFacts.length > 0 ? (
        <ul className="space-y-3">
          {funFacts.map((fact, index) => (
            <li 
              key={index} 
              className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 ease-in-out flex items-center space-x-3"
            >
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 italic">No special highlights from the tournament yet, but the excitement is building!</p>
      )}
    </div>
  );
};

export default TournamentFunStats; 