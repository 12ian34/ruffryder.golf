import { useState } from 'react';
import type { Player } from '../types/player';
import PlayerTable from './player/PlayerTable';
import PlayerEditModal from './player/PlayerEditModal';
import { usePlayerData } from '../hooks/usePlayerData';
import { showSuccessToast } from '../utils/toast';

export default function PlayerManagement() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const {
    players,
    isLoading,
    error,
    handleSavePlayer,
    handleDeletePlayer,
    sortField,
    sortDirection,
    toggleSort
  } = usePlayerData(undefined);

  const onSavePlayer = async (playerId: string | null, updates: Partial<Player>) => {
    await handleSavePlayer(playerId, updates);
    showSuccessToast(`Player ${playerId ? 'updated' : 'created'} successfully!`);
  };

  const onDeletePlayer = async (playerId: string) => {
    await handleDeletePlayer(playerId);
    showSuccessToast('Player deleted successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Manage Players</h2>
        <button
          onClick={() => {
            setSelectedPlayer(null);
            setShowEditModal(true);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Add New Player
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <PlayerTable
        players={players}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={toggleSort}
        onEdit={player => {
          setSelectedPlayer(player);
          setShowEditModal(true);
        }}
        onDelete={onDeletePlayer}
      />

      {showEditModal && (
        <PlayerEditModal
          player={selectedPlayer}
          onClose={() => setShowEditModal(false)}
          onSave={onSavePlayer}
        />
      )}
    </div>
  );
}