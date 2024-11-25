import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';

interface ScoreEntryProps {
  gameId: string;
  tournamentId: string;
  onClose: () => void;
}

export default function ScoreEntry({ gameId, tournamentId, onClose }: ScoreEntryProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<Array<{ USA: number | '', EUROPE: number | '' }>>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gameDoc, strokeIndicesDoc] = await Promise.all([
          getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId)),
          getDoc(doc(db, 'config', 'strokeIndices'))
        ]);

        if (gameDoc.exists()) {
          const gameData = gameDoc.data() as Game;
          setGame(gameData);
          setScores(gameData.holes.map(hole => ({
            USA: hole.usaPlayerScore || '',
            EUROPE: hole.europePlayerScore || ''
          })));
        } else {
          setError('Game not found');
        }

        if (strokeIndicesDoc.exists()) {
          setStrokeIndices(strokeIndicesDoc.data().indices);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, tournamentId]);

  const calculateAdjustedScore = (rawScore: number, hole: number, playerTeam: 'USA' | 'EUROPE'): number => {
    if (!game || !game.higherHandicapTeam || game.handicapStrokes === 0) {
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

  const handleScoreSubmit = async () => {
    if (!game) return;

    try {
      setIsLoading(true);
      
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
        isComplete: completedHoles === 18
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || 'Game not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">Enter Scores</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="font-medium text-blue-500">{game.usaPlayerName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-500">{game.europePlayerName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
          </div>
        </div>

        {game.handicapStrokes > 0 && game.higherHandicapTeam && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {game.holes.map((hole, index) => {
          const usaScore = scores[index].USA;
          const europeScore = scores[index].EUROPE;
          const adjustedUsaScore = typeof usaScore === 'number' ? 
            calculateAdjustedScore(usaScore, index + 1, 'USA') : null;
          const adjustedEuropeScore = typeof europeScore === 'number' ? 
            calculateAdjustedScore(europeScore, index + 1, 'EUROPE') : null;

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
                onChange={(e) => {
                  const newScores = [...scores];
                  newScores[index].USA = e.target.value ? parseInt(e.target.value) : '';
                  setScores(newScores);
                }}
                className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="USA"
              />
              <input
                type="number"
                min="1"
                max="8"
                value={scores[index].EUROPE}
                onChange={(e) => {
                  const newScores = [...scores];
                  newScores[index].EUROPE = e.target.value ? parseInt(e.target.value) : '';
                  setScores(newScores);
                }}
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
  );
}