import { useState, useEffect } from 'react';
import type { Matchup } from '../../types/tournament';
import { unpairFourball } from '../../services/matchupService';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface ExistingFourballsListProps {
  tournamentId: string | null;
  allMatchups: Matchup[];
  onUnpairComplete: () => void; // Callback to refresh data in parent
}

interface FourballGroup {
  fourballId: string;
  matchups: Matchup[];
}

export default function ExistingFourballsList({ tournamentId, allMatchups, onUnpairComplete }: ExistingFourballsListProps) {
  const [fourballGroups, setFourballGroups] = useState<FourballGroup[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({}); // Loading state per fourballId

  useEffect(() => {
    const grouped: Record<string, Matchup[]> = {};
    allMatchups.forEach(matchup => {
      if (matchup.fourballId) {
        if (!grouped[matchup.fourballId]) {
          grouped[matchup.fourballId] = [];
        }
        grouped[matchup.fourballId].push(matchup);
      }
    });

    const groupsArray: FourballGroup[] = Object.entries(grouped)
      .map(([fourballId, matchups]) => ({ fourballId, matchups }))
      .filter(group => group.matchups.length === 2); // Typically a fourball has two matchups
      // Could also show groups with 1 if a pair operation was interrupted, but for unpairing, 2 makes sense.

    setFourballGroups(groupsArray);
  }, [allMatchups]);

  const handleUnpair = async (fourballIdToUnpair: string) => {
    if (!tournamentId) {
      showErrorToast('Tournament ID is missing.');
      return;
    }
    setIsLoading(prev => ({ ...prev, [fourballIdToUnpair]: true }));
    try {
      await unpairFourball(tournamentId, fourballIdToUnpair);
      showSuccessToast('Fourball un-paired successfully!');
      onUnpairComplete(); // Notify parent to refetch/update data
    } catch (error: any) {
      console.error("Error un-pairing fourball:", error);
      showErrorToast(error.message || 'Failed to un-pair fourball.');
    } finally {
      setIsLoading(prev => ({ ...prev, [fourballIdToUnpair]: false }));
    }
  };

  if (!tournamentId) {
    // This case should ideally be handled by the parent component not rendering this list
    return null; 
  }

  if (fourballGroups.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mt-6">
        <h3 className="text-lg font-medium mb-4 dark:text-white">Current Fourball Pairings</h3>
        <p className="text-gray-500 dark:text-gray-400">No fourball pairings have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mt-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Current Fourball Pairings</h3>
      <div className="space-y-4">
        {fourballGroups.map(group => (
          <div key={group.fourballId} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-semibold text-purple-700 dark:text-purple-400">
                Fourball ID: <span className="font-mono text-xs">{group.fourballId.substring(0,8)}...</span>
              </h4>
              <button
                onClick={() => handleUnpair(group.fourballId)}
                disabled={isLoading[group.fourballId]}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading[group.fourballId] ? (
                  <svg className="animate-spin h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                )}
                Unpair this Fourball
              </button>
            </div>
            <ul className="space-y-2">
              {group.matchups.map(matchup => (
                <li key={matchup.id} className="text-sm p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{matchup.usaPlayerName} vs {matchup.europePlayerName}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(ID: {matchup.id.substring(0,6)}...)</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
} 