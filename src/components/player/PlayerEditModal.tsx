import React, { useState, useEffect } from 'react';
import type { Player } from '../../types/player';

interface PlayerEditModalProps {
  player: Player | null;
  onClose: () => void;
  onSave: (playerId: string | null, updates: Partial<Player>) => Promise<void>;
}

export default function PlayerEditModal({ player, onClose, onSave }: PlayerEditModalProps) {
  const [name, setName] = useState(player?.name || '');
  const [team, setTeam] = useState<'USA' | 'EUROPE'>(player?.team || 'USA');
  const [year, setYear] = useState(new Date().getFullYear());
  const [score, setScore] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
        historicalScores: player?.historicalScores ?? []
      };

      if (score) {
        const currentScores = updates.historicalScores ?? [];
        const existingScore = currentScores.find(s => s.year === year);
        const newScores = existingScore
          ? currentScores.map(s => 
              s.year === year ? { ...s, score: Number(score) } : s
            )
          : [...currentScores, { year, score: Number(score) }];

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
              className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isLoading}
              placeholder="Enter player name"
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
              className="px-4 py-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}