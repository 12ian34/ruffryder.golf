import { useState, useEffect } from 'react';
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Player } from '../types/player';

export default function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [score, setScore] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !score) return;

    try {
      setIsLoading(true);
      const playerRef = doc(db, 'players', selectedPlayer.id);
      
      // Update historical scores
      const updatedScores = [...selectedPlayer.historicalScores];
      const existingScoreIndex = updatedScores.findIndex(s => s.year === year);
      
      if (existingScoreIndex >= 0) {
        updatedScores[existingScoreIndex].score = Number(score);
      } else {
        updatedScores.push({ year, score: Number(score) });
      }

      // Calculate new average from last 3 years
      const sortedScores = [...updatedScores].sort((a, b) => b.year - a.year);
      const lastThreeScores = sortedScores.slice(0, 3);
      const averageScore = Math.round(
        lastThreeScores.reduce((sum, s) => sum + s.score, 0) / lastThreeScores.length
      );

      await updateDoc(playerRef, {
        historicalScores: updatedScores,
        averageScore
      });

      // Update local state
      setPlayers(players.map(p => 
        p.id === selectedPlayer.id
          ? { ...p, historicalScores: updatedScores, averageScore }
          : p
      ));

      setScore('');
      alert('Score updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-white">Manage Players</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Player List */}
        <div>
          <h3 className="text-lg font-medium mb-4 dark:text-white">Players</h3>
          <div className="space-y-2">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`w-full text-left p-3 rounded-lg ${
                  selectedPlayer?.id === player.id
                    ? 'bg-blue-50 dark:bg-blue-900'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium dark:text-white">
                      {player.name}
                    </span>
                    <span className={`ml-2 text-sm ${
                      player.team === 'USA' 
                        ? 'text-blue-500' 
                        : 'text-red-500'
                    }`}>
                      {player.team}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Avg: {player.averageScore}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Score Entry */}
        {selectedPlayer && (
          <div>
            <h3 className="text-lg font-medium mb-4 dark:text-white">
              Add/Update Score
            </h3>
            <form onSubmit={handleScoreSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Array.from({ length: 5 }, (_, i) => year - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Score
                </label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter score"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Score'}
              </button>
            </form>

            {/* Historical Scores */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Historical Scores
              </h4>
              <div className="space-y-2">
                {selectedPlayer.historicalScores
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
          </div>
        )}
      </div>
    </div>
  );
}