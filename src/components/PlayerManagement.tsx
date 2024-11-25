import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Player } from '../types/player';

type SortField = 'name' | 'team' | 'averageScore' | number;
type SortDirection = 'asc' | 'desc';

interface EditModalProps {
  player: Player | null;
  onClose: () => void;
  onSave: (playerId: string | null, updates: Partial<Player>) => Promise<void>;
}

function EditModal({ player, onClose, onSave }: EditModalProps) {
  const [name, setName] = useState(player?.name || '');
  const [team, setTeam] = useState<'USA' | 'EUROPE'>(player?.team || 'USA');
  const [year, setYear] = useState(new Date().getFullYear());
  const [score, setScore] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const updates: Partial<Player> = {
        name: name.trim(),
        team,
        historicalScores: player?.historicalScores || []
      };

      if (score) {
        const existingScore = updates.historicalScores?.find(s => s.year === year);
        const newScores = existingScore
          ? updates.historicalScores.map(s => 
              s.year === year ? { ...s, score: Number(score) } : s
            )
          : [...updates.historicalScores, { year, score: Number(score) }];

        // Calculate new average from last 3 years
        const sortedScores = [...newScores].sort((a, b) => b.year - a.year);
        const lastThreeScores = sortedScores.slice(0, 3);
        const averageScore = Math.round(
          lastThreeScores.reduce((sum, s) => sum + s.score, 0) / lastThreeScores.length
        );

        updates.historicalScores = newScores;
        updates.averageScore = averageScore;
      }

      await onSave(player?.id || null, updates);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreForYear = (year: number) => {
    const score = player?.historicalScores.find(s => s.year === year)?.score;
    return score !== undefined ? score.toString() : '';
  };

  useEffect(() => {
    setScore(getScoreForYear(year));
  }, [year]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold dark:text-white">
            {player ? 'Edit Player' : 'Add New Player'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Team
            </label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as 'USA' | 'EUROPE')}
              className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="USA">USA</option>
              <option value="EUROPE">EUROPE</option>
            </select>
          </div>

          {player && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Add/Update Score
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Score"
                    className="px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Historical Scores
                </h4>
                <div className="space-y-2">
                  {player.historicalScores
                    .sort((a, b) => b.year - a.year)
                    .map((score) => (
                      <div
                        key={score.year}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          {score.year}
                        </span>
                        <span className="font-medium dark:text-white">
                          {score.score}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        setPlayers(playersData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSavePlayer = async (playerId: string | null, updates: Partial<Player>) => {
    try {
      if (playerId) {
        // Update existing player
        await updateDoc(doc(db, 'players', playerId), updates);
        setPlayers(players.map(p => 
          p.id === playerId ? { ...p, ...updates } : p
        ));
      } else {
        // Create new player
        const docRef = await addDoc(collection(db, 'players'), {
          ...updates,
          averageScore: 0,
          historicalScores: []
        });
        const newPlayer = {
          id: docRef.id,
          ...updates,
          averageScore: 0,
          historicalScores: []
        } as Player;
        setPlayers([...players, newPlayer]);
      }
      setSuccessMessage(`Player ${playerId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'players', playerId));
      setPlayers(players.filter(p => p.id !== playerId));
      setSuccessMessage('Player deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'team':
        return direction * a.team.localeCompare(b.team);
      case 'averageScore':
        return direction * (a.averageScore - b.averageScore);
      default:
        const aScore = a.historicalScores.find(s => s.year === sortField)?.score ?? 999;
        const bScore = b.historicalScores.find(s => s.year === sortField)?.score ?? 999;
        return direction * (aScore - bScore);
    }
  });

  const years = Array.from(
    new Set(
      players.flatMap(p => p.historicalScores.map(s => s.year))
    )
  ).sort((a, b) => b - a);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th 
                onClick={() => toggleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => toggleSort('team')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Team {sortField === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => toggleSort('averageScore')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              >
                Average {sortField === 'averageScore' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {years.map(year => (
                <th 
                  key={year}
                  onClick={() => toggleSort(year)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                >
                  {year} {sortField === year && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPlayers.map((player) => (
              <tr key={player.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium dark:text-white">{player.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    player.team === 'USA'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {player.team}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {player.averageScore}
                </td>
                {years.map(year => (
                  <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {player.historicalScores.find(s => s.year === year)?.score || '-'}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-4">
                  <button
                    onClick={() => {
                      setSelectedPlayer(player);
                      setShowEditModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <EditModal
          player={selectedPlayer}
          onClose={() => setShowEditModal(false)}
          onSave={handleSavePlayer}
        />
      )}
    </div>
  );
}