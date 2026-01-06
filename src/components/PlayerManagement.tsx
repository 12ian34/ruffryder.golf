import { useState } from 'react';
import type { Player } from '../types/player';
import PlayerTable from './player/PlayerTable';
import PlayerEditModal from './player/PlayerEditModal';
import { usePlayerData } from '../hooks/usePlayerData';
import { showSuccessToast, showErrorToast } from '../utils/toast';

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

  const onSaveModal = async (playerId: string | null, updates: Partial<Player>) => {
    try {
      await handleSavePlayer(playerId, updates);
      showSuccessToast(`Player data ${playerId ? 'updated' : 'created'} successfully!`);
      setShowEditModal(false);
    } catch (err: any) {
      showErrorToast(err.message || `Failed to ${playerId ? 'update' : 'create'} player`);
    }
  };

  const onDeletePlayer = async (playerId: string) => {
    try {
      await handleDeletePlayer(playerId);
      showSuccessToast('Player deleted successfully!');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete player');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading player data: {error}
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
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
        >
          Add New Player
        </button>
      </div>

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
          onSave={onSaveModal}
        />
      )}
    </div>
  );
}