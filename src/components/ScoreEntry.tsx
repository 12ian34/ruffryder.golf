import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';

interface ScoreEntryProps {
  gameId: string;
  tournamentId: string;
  onClose: () => void;
  onSave?: () => void;
}

export default function ScoreEntry({ gameId, tournamentId, onClose, onSave }: ScoreEntryProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<Array<{ USA: number | '', EUROPE: number | '' }>>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch game data and stroke indices
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch game and stroke indices
        const [gameDoc, strokeIndicesDoc] = await Promise.all([
          getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId)),
          getDoc(doc(db, 'config', 'strokeIndices'))
        ]);

        if (!isMounted) return;

        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as Game;
        const indices = strokeIndicesDoc.data()?.indices || [];

        // Initialize scores from game data
        const initialScores = gameData.holes.map(hole => ({
          USA: (typeof hole.usaPlayerScore === 'number' ? hole.usaPlayerScore : '') as (number | ''),
          EUROPE: (typeof hole.europePlayerScore === 'number' ? hole.europePlayerScore : '') as (number | '')
        }));

        setGame(gameData);
        setScores(initialScores);
        setStrokeIndices(indices);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load game data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, [gameId, tournamentId]);

  const handleScoreChange = (holeIndex: number, team: 'USA' | 'EUROPE', value: string) => {
    // Validate input
    if (value !== '') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 20) {
        setError('Score must be between 1 and 20');
        return;
      }
    }

    const newScores = [...scores];
    newScores[holeIndex] = {
      ...newScores[holeIndex],
      [team]: value === '' ? '' : parseInt(value)
    };
    
    setScores(newScores);
  };

  const handleScoreSubmit = async () => {
    if (!game) return;

    try {
      setIsLoading(true);
      setError(null);

      // Update hole scores
      const updatedHoles = game.holes.map((hole, index) => {
        const usaScore = typeof scores[index].USA === 'number' ? scores[index].USA : null;
        const europeScore = typeof scores[index].EUROPE === 'number' ? scores[index].EUROPE : null;

        // Calculate adjusted scores if both scores are present
        let usaAdjustedScore = null;
        let europeAdjustedScore = null;
        let usaMatchPlayScore = 0;
        let europeMatchPlayScore = 0;
        let usaMatchPlayAdjustedScore = 0;
        let europeMatchPlayAdjustedScore = 0;

        if (usaScore !== null && europeScore !== null) {
          // Calculate base strokes for this hole (integer division)
          const baseStrokes = Math.floor(game.handicapStrokes / 18);
          
          // Calculate extra stroke for low index holes
          // If handicap is 22, then first 4 holes (by stroke index) get an extra stroke
          const extraStrokeHoles = game.handicapStrokes % 18;
          const getsExtraStroke = hole.strokeIndex <= extraStrokeHoles;
          
          // Total strokes for this hole
          const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);

          // Apply strokes based on which team gets them
          if (game.higherHandicapTeam !== 'USA') {
            usaAdjustedScore = usaScore + strokesForHole;
            europeAdjustedScore = europeScore;
          } else {
            usaAdjustedScore = usaScore;
            europeAdjustedScore = europeScore + strokesForHole;
          }

          // Calculate raw match play scores for this hole
          if (usaScore < europeScore) {
            usaMatchPlayScore = 1;
            europeMatchPlayScore = 0;
          } else if (europeScore < usaScore) {
            usaMatchPlayScore = 0;
            europeMatchPlayScore = 1;
          } else {
            // Halved hole
            usaMatchPlayScore = 0;
            europeMatchPlayScore = 0;
          }

          // Calculate adjusted match play scores for this hole
          if (usaAdjustedScore < europeAdjustedScore) {
            usaMatchPlayAdjustedScore = 1;
            europeMatchPlayAdjustedScore = 0;
          } else if (europeAdjustedScore < usaAdjustedScore) {
            usaMatchPlayAdjustedScore = 0;
            europeMatchPlayAdjustedScore = 1;
          } else {
            // Halved hole
            usaMatchPlayAdjustedScore = 0;
            europeMatchPlayAdjustedScore = 0;
          }
        }

        return {
          ...hole,
          usaPlayerScore: usaScore,
          europePlayerScore: europeScore,
          usaPlayerAdjustedScore: usaAdjustedScore,
          europePlayerAdjustedScore: europeAdjustedScore,
          usaPlayerMatchPlayScore: usaMatchPlayScore,
          europePlayerMatchPlayScore: europeMatchPlayScore,
          usaPlayerMatchPlayAdjustedScore: usaMatchPlayAdjustedScore,
          europePlayerMatchPlayAdjustedScore: europeMatchPlayAdjustedScore
        };
      });

      // Calculate totals from the stored adjusted scores
      let usaRawTotal = 0;
      let europeRawTotal = 0;
      let usaAdjustedTotal = 0;
      let europeAdjustedTotal = 0;
      let usaMatchPlayRawTotal = 0;
      let europeMatchPlayRawTotal = 0;
      let usaMatchPlayAdjustedTotal = 0;
      let europeMatchPlayAdjustedTotal = 0;
      let completed = 0;

      updatedHoles.forEach((hole) => {
        if (hole.usaPlayerScore !== null && hole.europePlayerScore !== null) {
          // Add raw scores
          usaRawTotal += hole.usaPlayerScore;
          europeRawTotal += hole.europePlayerScore;
          completed++;

          // Add adjusted scores
          if (hole.usaPlayerAdjustedScore !== null && hole.europePlayerAdjustedScore !== null) {
            usaAdjustedTotal += hole.usaPlayerAdjustedScore;
            europeAdjustedTotal += hole.europePlayerAdjustedScore;
          }

          // Add match play scores
          if (hole.usaPlayerMatchPlayScore !== undefined) {
            usaMatchPlayRawTotal += hole.usaPlayerMatchPlayScore;
          }
          if (hole.europePlayerMatchPlayScore !== undefined) {
            europeMatchPlayRawTotal += hole.europePlayerMatchPlayScore;
          }
          if (hole.usaPlayerMatchPlayAdjustedScore !== undefined) {
            usaMatchPlayAdjustedTotal += hole.usaPlayerMatchPlayAdjustedScore;
          }
          if (hole.europePlayerMatchPlayAdjustedScore !== undefined) {
            europeMatchPlayAdjustedTotal += hole.europePlayerMatchPlayAdjustedScore;
          }
        }
      });

      // Update game document
      const gameRef = doc(db, 'tournaments', tournamentId, 'games', gameId);
      await updateDoc(gameRef, {
        holes: updatedHoles,
        strokePlayScore: { 
          USA: usaRawTotal,
          EUROPE: europeRawTotal,
          adjustedUSA: usaAdjustedTotal,
          adjustedEUROPE: europeAdjustedTotal
        },
        matchPlayScore: {
          USA: usaMatchPlayRawTotal,
          EUROPE: europeMatchPlayRawTotal,
          adjustedUSA: usaMatchPlayAdjustedTotal,
          adjustedEUROPE: europeMatchPlayAdjustedTotal
        },
        isStarted: true,
        completedHoles: completed
      });

      // Wait for a short delay to ensure Firestore has propagated the update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update tournament scores
      await updateTournamentScores(tournamentId);

      // Call onSave after successful update
      if (onSave) {
        await onSave();
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save scores:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-red-500">{error || 'Game not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Enter Scores</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="font-medium text-red-500">
                {game.usaPlayerName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-500">
                {game.europePlayerName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {game.holes.map((hole, index) => {
            // Calculate if this hole gets a stroke
            const strokesForHole = Math.floor(game.handicapStrokes / 18) + 
              (hole.strokeIndex <= (game.handicapStrokes % 18) ? 1 : 0);
            const showStrokeIndicator = game.higherHandicapTeam !== 'USA' && strokesForHole > 0;

            return (
              <div key={hole.holeNumber} className="grid grid-cols-3 gap-4 items-center">
                <div className="text-sm">
                  <div className="font-medium dark:text-white">Hole {hole.holeNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400">
                    SI: {strokeIndices[index] ?? '-'}
                  </div>
                  {showStrokeIndicator && (
                    <div className="text-xs text-blue-500">+{strokesForHole} stroke{strokesForHole > 1 ? 's' : ''}</div>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={scores[index].USA}
                  onChange={(e) => handleScoreChange(index, 'USA', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="USA"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={scores[index].EUROPE}
                  onChange={(e) => handleScoreChange(index, 'EUROPE', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="EUR"
                />
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t dark:border-gray-700 mt-4">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleScoreSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Scores'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}