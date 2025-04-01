import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

interface ScoreEntryProps {
  gameId: string;
  tournamentId: string;
  onClose: () => void;
  isOnline: boolean;
}

export default function ScoreEntry({ gameId, tournamentId, onClose }: ScoreEntryProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<Array<{ USA: number | '', EUROPE: number | '' }>>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustedScores, setAdjustedScores] = useState<Array<{ USA: number | null, EUROPE: number | null }>>([]);
  const [useHandicaps, setUseHandicaps] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gameDoc, strokeIndicesDoc, tournamentDoc] = await Promise.all([
          getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId)),
          getDoc(doc(db, 'config', 'strokeIndices')),
          getDoc(doc(db, 'tournaments', tournamentId))
        ]);

        if (gameDoc.exists()) {
          const gameData = gameDoc.data() as Game;
          setGame(gameData);
          setScores(gameData.holes.map(hole => ({
            USA: hole.usaPlayerScore || '',
            EUROPE: hole.europePlayerScore || ''
          })));
          setAdjustedScores(gameData.holes.map(() => ({ USA: null, EUROPE: null })));
        } else {
          setError('Game not found');
        }

        if (strokeIndicesDoc.exists()) {
          setStrokeIndices(strokeIndicesDoc.data().indices);
        }

        if (tournamentDoc.exists()) {
          setUseHandicaps(tournamentDoc.data().useHandicaps);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, tournamentId]);

  const calculateAdjustedScore = async (rawScore: number, hole: number, playerTeam: 'USA' | 'EUROPE'): Promise<number> => {
    if (!game || !game.higherHandicapTeam || game.handicapStrokes === 0) {
      return rawScore;
    }

    // Get tournament data to check handicap setting
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    if (!tournamentDoc.exists() || !tournamentDoc.data().useHandicaps) {
      return rawScore;
    }

    // Only add strokes to the player NOT on the higher handicap team
    if (playerTeam === game.higherHandicapTeam) {
      return rawScore;
    }

    const handicapStrokes = game.handicapStrokes;
    const strokesForHole = Math.floor(handicapStrokes / 18) + 
      (strokeIndices[hole - 1] <= (handicapStrokes % 18) ? 1 : 0);

    return rawScore + strokesForHole;
  };

  const handleScoreChange = async (holeIndex: number, team: 'USA' | 'EUROPE', value: string) => {
    // Validate input
    if (value !== '') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 20) {
        setError('Score must be between 1 and 20');
        return;
      }
    }

    const newScores = [...scores];
    newScores[holeIndex][team] = value ? parseInt(value) : '';
    setScores(newScores);

    // Optimistically update adjusted scores
    if (typeof newScores[holeIndex].USA === 'number' && typeof newScores[holeIndex].EUROPE === 'number') {
      const newAdjustedScores = [...adjustedScores];
      newAdjustedScores[holeIndex] = {
        USA: await calculateAdjustedScore(newScores[holeIndex].USA as number, holeIndex + 1, 'USA'),
        EUROPE: await calculateAdjustedScore(newScores[holeIndex].EUROPE as number, holeIndex + 1, 'EUROPE')
      };
      setAdjustedScores(newAdjustedScores);
    }
  };

  const handleScoreSubmit = async () => {
    if (!game) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Validate all scores before submission
      for (let i = 0; i < scores.length; i++) {
        const usaScore = scores[i].USA;
        const europeScore = scores[i].EUROPE;
        
        if (typeof usaScore === 'number' && (usaScore < 1 || usaScore > 20)) {
          throw new Error(`Invalid USA score on hole ${i + 1}`);
        }
        if (typeof europeScore === 'number' && (europeScore < 1 || europeScore > 20)) {
          throw new Error(`Invalid Europe score on hole ${i + 1}`);
        }
      }
      
      // Update hole scores
      const updatedHoles = game.holes.map((hole, index) => ({
        ...hole,
        usaPlayerScore: typeof scores[index].USA === 'number' ? scores[index].USA : null,
        europePlayerScore: typeof scores[index].EUROPE === 'number' ? scores[index].EUROPE : null
      }));

      // Calculate running totals
      let usaStrokeTotal = 0;
      let europeStrokeTotal = 0;
      let usaHolesWon = 0;
      let europeHolesWon = 0;
      let completedHoles = 0;

      updatedHoles.forEach((hole, index) => {
        if (hole.usaPlayerScore !== null && hole.europePlayerScore !== null) {
          const adjustedUsaScore = calculateAdjustedScore(hole.usaPlayerScore, index + 1, 'USA');
          const adjustedEuropeScore = calculateAdjustedScore(hole.europePlayerScore, index + 1, 'EUROPE');

          usaStrokeTotal += hole.usaPlayerScore;
          europeStrokeTotal += hole.europePlayerScore;
          completedHoles++;

          if (adjustedUsaScore < adjustedEuropeScore) usaHolesWon++;
          else if (adjustedEuropeScore < adjustedUsaScore) europeHolesWon++;
        }
      });

      // Update game document
      const gameRef = doc(db, 'tournaments', tournamentId, 'games', gameId);
      await updateDoc(gameRef, {
        holes: updatedHoles,
        strokePlayScore: {
          USA: usaStrokeTotal,
          EUROPE: europeStrokeTotal
        },
        matchPlayScore: {
          USA: usaHolesWon,
          EUROPE: europeHolesWon
        },
        isStarted: true
      });

      onClose();
    } catch (err: any) {
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
              <div className="font-medium text-red-500">{game.usaPlayerName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-500">{game.europePlayerName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
            </div>
          </div>

          {useHandicaps && game.handicapStrokes > 0 && game.higherHandicapTeam && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {game.holes.map((hole, index) => {
            const adjustedUsaScore = adjustedScores[index].USA;
            const adjustedEuropeScore = adjustedScores[index].EUROPE;

            return (
              <div key={hole.holeNumber} className="grid grid-cols-3 gap-4 items-center">
                <div className="text-sm">
                  <div className="font-medium dark:text-white">Hole {hole.holeNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400">
                    SI: {strokeIndices[index]}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={scores[index].USA}
                  onChange={(e) => handleScoreChange(index, 'USA', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="USA"
                />
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={scores[index].EUROPE}
                  onChange={(e) => handleScoreChange(index, 'EUROPE', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="EUR"
                />
                {adjustedUsaScore !== null && adjustedEuropeScore !== null && (
                  <div className="col-span-3 text-sm text-gray-500 dark:text-gray-400">
                    Adjusted scores: {adjustedUsaScore} - {adjustedEuropeScore}
                    {' '}
                    ({adjustedUsaScore < adjustedEuropeScore ? 'USA wins hole' : 
                      adjustedEuropeScore < adjustedUsaScore ? 'EUROPE wins hole' : 
                      'Hole halved'})
                  </div>
                )}
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