import { useState, useEffect } from 'react';
import type { Matchup } from '../../types/tournament';
import { pairMatchups } from '../../services/matchupService';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface FourballPairingProps {
  tournamentId: string | null;
  allMatchups: Matchup[];
  onPairingComplete: () => void; // Callback to refresh data in parent
}

export default function FourballPairing({ tournamentId, allMatchups, onPairingComplete }: FourballPairingProps) {
  const [availableMatchups, setAvailableMatchups] = useState<Matchup[]>([]);
  const [selectedMatchupIds, setSelectedMatchupIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Filter matchups that don't have a fourballId
    const unassigned = allMatchups.filter(m => !m.fourballId);
    setAvailableMatchups(unassigned);
    // Reset selection when available matchups change
    setSelectedMatchupIds([]); 
  }, [allMatchups]);

  const handleMatchupSelection = (matchupId: string) => {
    setSelectedMatchupIds(prevSelected => {
      if (prevSelected.includes(matchupId)) {
        return prevSelected.filter(id => id !== matchupId);
      }
      if (prevSelected.length < 2) {
        return [...prevSelected, matchupId];
      }
      // If 2 are already selected, replace the first one with the new one
      // This provides a simple way to change selection without explicit deselection
      return [prevSelected[1], matchupId]; 
    });
  };

  const handlePairSelectedMatchups = async () => {
    if (!tournamentId || selectedMatchupIds.length !== 2) {
      showErrorToast('Please select exactly two matchups to pair and ensure a tournament is active.');
      return;
    }
    setIsLoading(true);
    try {
      await pairMatchups(tournamentId, selectedMatchupIds[0], selectedMatchupIds[1]);
      showSuccessToast('Matchups paired successfully!');
      setSelectedMatchupIds([]); // Reset selection
      onPairingComplete(); // Notify parent to refetch/update data
    } catch (error: any) {
      console.error("Error pairing matchups:", error);
      showErrorToast(error.message || 'Failed to pair matchups.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tournamentId) {
    return <p className="text-gray-500 dark:text-gray-400">Select a tournament to manage fourballs.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mt-6">
      <h3 className="text-lg font-medium mb-4 dark:text-white">Pair Matchups into Fourballs</h3>
      {availableMatchups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No available matchups to pair. All matchups might already be in fourballs or no matchups created yet.</p>
      ) : (
        <div className="space-y-3">
          {availableMatchups.map(matchup => (
            <div 
              key={matchup.id}
              className={`p-3 rounded-md border flex items-center justify-between transition-colors 
                ${selectedMatchupIds.includes(matchup.id) 
                  ? 'bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-600' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600/70'}
              `}
            >
              <label htmlFor={`matchup-${matchup.id}`} className="flex items-center space-x-3 cursor-pointer w-full">
                <input
                  type="checkbox"
                  id={`matchup-${matchup.id}`}
                  checked={selectedMatchupIds.includes(matchup.id)}
                  onChange={() => handleMatchupSelection(matchup.id)}
                  className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {matchup.usaPlayerName} vs {matchup.europePlayerName}
                </span>
                 <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">ID: {matchup.id.substring(0,6)}...</span>
              </label>
            </div>
          ))}
        </div>
      )}
      {availableMatchups.length > 1 && (
        <button
          onClick={handlePairSelectedMatchups}
          disabled={selectedMatchupIds.length !== 2 || isLoading}
          className="mt-4 w-full bg-gradient-to-br from-purple-500 to-purple-600 text-white py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
              <path d="M3.105 6.105a1 1 0 011.414 0L8 9.586l5-5V3.5a1.5 1.5 0 00-3 0V2a4 4 0 00-8 0v1.5a1.5 1.5 0 00-3 0V7a1 1 0 011-1h2.586l-2.5-2.5a1 1 0 010-1.414zM10 12a1 1 0 011 1v2.586l2.5-2.5a1 1 0 111.414 1.414l-4.536 4.536a1 1 0 01-1.414 0l-4.536-4.536a1 1 0 011.414-1.414l2.5 2.5V13a1 1 0 011-1z" />
            </svg>

          )}
          Pair Selected ({selectedMatchupIds.length}/2)
        </button>
      )}
    </div>
  );
} 