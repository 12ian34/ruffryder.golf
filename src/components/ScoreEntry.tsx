import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game, HoleScore } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';
import { calculateGamePoints } from '../utils/gamePoints';

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
  const [showClearConfirm, setShowClearConfirm] = useState<number | null>(null);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleEscape, { capture: true });
    };
  }, [onClose]);

  // Fetch game data and stroke indices
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch game, tournament settings, and stroke indices
        const [gameDoc, tournamentDoc, strokeIndicesDoc] = await Promise.all([
          getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId)),
          getDoc(doc(db, 'tournaments', tournamentId)),
          getDoc(doc(db, 'config', 'strokeIndices'))
        ]);

        if (!isMounted) return;

        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as Game;
        const tournamentData = tournamentDoc.data();
        const indices = strokeIndicesDoc.data()?.indices || [];

        // Update game data with tournament settings if needed
        if (tournamentData?.useHandicaps && (!gameData.handicapStrokes || gameData.handicapStrokes === 0)) {
          // Calculate handicap strokes based on player handicaps
          const [usaPlayerDoc, europePlayerDoc] = await Promise.all([
            getDoc(doc(db, 'players', gameData.usaPlayerId)),
            getDoc(doc(db, 'players', gameData.europePlayerId))
          ]);

          const usaHandicap = usaPlayerDoc.exists() ? usaPlayerDoc.data().averageScore : 0;
          const europeHandicap = europePlayerDoc.exists() ? europePlayerDoc.data().averageScore : 0;
          
          // Calculate handicap difference
          const handicapDiff = Math.abs(usaHandicap - europeHandicap);
          const higherHandicapTeam = usaHandicap > europeHandicap ? 'USA' : 'EUROPE';

          // Update game data
          gameData.handicapStrokes = handicapDiff;
          gameData.higherHandicapTeam = higherHandicapTeam;
          
          // Update the game document in Firestore
          await updateDoc(doc(db, 'tournaments', tournamentId, 'games', gameId), {
            handicapStrokes: handicapDiff,
            higherHandicapTeam: higherHandicapTeam
          });
        }

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

  const handleClearHole = (index: number) => {
    const newScores = [...scores];
    newScores[index] = {
      USA: '',
      EUROPE: ''
    };
    setScores(newScores);
    setShowClearConfirm(null);
  };

  // Remove all the debug console.log statements for handicap calculations
  const calculateStrokesForHole = (hole: HoleScore, handicap: number) => {
    const baseStrokes = Math.floor(handicap / 18);
    const extraStrokeHoles = handicap % 18;
    const getsExtraStroke = extraStrokeHoles >= hole.strokeIndex;
    const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);
    return strokesForHole;
  };
  
  console.log('calculateStrokesForHole', calculateStrokesForHole)
  const handleScoreSubmit = async () => {
    if (!game) return;

    try {
      setIsLoading(true);
      setError(null);

      // Calculate scores from the input values
      const updatedHoles = game.holes.map((hole, index) => {
        const usaScore = typeof scores[index].USA === 'number' ? scores[index].USA : null;
        const europeScore = typeof scores[index].EUROPE === 'number' ? scores[index].EUROPE : null;

        // Initialize all scores
        let usaAdjustedScore = usaScore;
        let europeAdjustedScore = europeScore;
        let usaMatchPlayScore = 0;
        let europeMatchPlayScore = 0;
        let usaMatchPlayAdjustedScore = 0;
        let europeMatchPlayAdjustedScore = 0;

        if (usaScore !== null && europeScore !== null) {
          // Calculate base strokes for this hole (integer division)
          const baseStrokes = Math.floor(game.handicapStrokes / 18);
          
          // Calculate extra stroke for low index holes
          const extraStrokeHoles = game.handicapStrokes % 18;
          // A hole gets an extra stroke if its stroke index is less than or equal to the remainder
          const getsExtraStroke = hole.strokeIndex <= extraStrokeHoles;
          
          // Total strokes for this hole
          const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);

          // Always calculate adjusted scores based on handicap strokes
          if (game.higherHandicapTeam === 'USA') {
            usaAdjustedScore = usaScore;
            europeAdjustedScore = europeScore + strokesForHole;
          } else {
            usaAdjustedScore = usaScore + strokesForHole;
            europeAdjustedScore = europeScore;
          }

          // Calculate raw match play scores
          if (usaScore < europeScore) {
            usaMatchPlayScore = 1;
            europeMatchPlayScore = 0;
          } else if (europeScore < usaScore) {
            usaMatchPlayScore = 0;
            europeMatchPlayScore = 1;
          }

          // Calculate adjusted match play scores
          if (usaAdjustedScore < europeAdjustedScore) {
            usaMatchPlayAdjustedScore = 1;
            europeMatchPlayAdjustedScore = 0;
          } else if (europeAdjustedScore < usaAdjustedScore) {
            usaMatchPlayAdjustedScore = 0;
            europeMatchPlayAdjustedScore = 1;
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

      // Check if all holes have scores
      const isComplete = updatedHoles.every(
        hole => hole.usaPlayerScore !== null && hole.europePlayerScore !== null
      );

      // Calculate totals
      const totals = updatedHoles.reduce((acc, hole) => {
        if (hole.usaPlayerScore !== null && hole.europePlayerScore !== null) {
          acc.usaRaw += hole.usaPlayerScore;
          acc.europeRaw += hole.europePlayerScore;
          if (hole.usaPlayerAdjustedScore !== null) {
            acc.usaAdjusted += hole.usaPlayerAdjustedScore;
          }
          if (hole.europePlayerAdjustedScore !== null) {
            acc.europeAdjusted += hole.europePlayerAdjustedScore;
          }
          acc.usaMatchPlay += hole.usaPlayerMatchPlayScore;
          acc.europeMatchPlay += hole.europePlayerMatchPlayScore;
          acc.usaMatchPlayAdjusted += hole.usaPlayerMatchPlayAdjustedScore;
          acc.europeMatchPlayAdjusted += hole.europePlayerMatchPlayAdjustedScore;
        }
        return acc;
      }, {
        usaRaw: 0,
        europeRaw: 0,
        usaAdjusted: 0,
        europeAdjusted: 0,
        usaMatchPlay: 0,
        europeMatchPlay: 0,
        usaMatchPlayAdjusted: 0,
        europeMatchPlayAdjusted: 0
      });

      // Create updated game object to calculate points
      const updatedGame: Game = {
        ...game,
        holes: updatedHoles,
        strokePlayScore: {
          USA: totals.usaRaw,
          EUROPE: totals.europeRaw,
          adjustedUSA: totals.usaAdjusted,
          adjustedEUROPE: totals.europeAdjusted
        },
        matchPlayScore: {
          USA: totals.usaMatchPlay,
          EUROPE: totals.europeMatchPlay,
          adjustedUSA: totals.usaMatchPlayAdjusted,
          adjustedEUROPE: totals.europeMatchPlayAdjusted
        }
      };

      // Calculate points
      const points = calculateGamePoints(updatedGame);

      // Update the game document with the calculated scores and points
      const gameRef = doc(db, 'tournaments', tournamentId, 'games', gameId);
      await updateDoc(gameRef, {
        holes: updatedHoles,
        strokePlayScore: {
          USA: totals.usaRaw,
          EUROPE: totals.europeRaw,
          adjustedUSA: totals.usaAdjusted,
          adjustedEUROPE: totals.europeAdjusted
        },
        matchPlayScore: {
          USA: totals.usaMatchPlay,
          EUROPE: totals.europeMatchPlay,
          adjustedUSA: totals.usaMatchPlayAdjusted,
          adjustedEUROPE: totals.europeMatchPlayAdjusted
        },
        points,
        isStarted: true,
        isComplete,
        status: isComplete ? 'complete' : 'in_progress',
        endTime: isComplete ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      // Update tournament scores
      await updateTournamentScores(tournamentId);

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving scores:', error);
      setError('Failed to save scores. Please try again.');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
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

          <div className="flex justify-between items-center px-8 mb-4">
            <div className="w-[40%] text-center">
              <div className="font-medium text-red-500 text-lg">
                {game.usaPlayerName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
            </div>
            <div className="text-2xl text-gray-400 dark:text-gray-600">vs</div>
            <div className="w-[40%] text-center">
              <div className="font-medium text-blue-500 text-lg">
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
              <div key={hole.holeNumber} className="grid grid-cols-[60px_1fr_32px] gap-2 items-center">
                <div className="text-sm">
                  <div className="font-medium dark:text-white">Hole {hole.holeNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400">
                    SI: {strokeIndices[index] ?? '-'}
                  </div>
                  {showStrokeIndicator && (
                    <div className="text-xs text-blue-500">+{strokesForHole} stroke{strokesForHole > 1 ? 's' : ''}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 px-8">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={scores[index].USA}
                    onChange={(e) => handleScoreChange(index, 'USA', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                    placeholder="USA"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={scores[index].EUROPE}
                    onChange={(e) => handleScoreChange(index, 'EUROPE', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                    placeholder="EUR"
                  />
                </div>
                <div className="flex justify-center">
                  {(scores[index].USA !== '' || scores[index].EUROPE !== '') && (
                    showClearConfirm === index ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleClearHole(index)}
                          className="p-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          title="Confirm clear"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(null)}
                          className="p-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          title="Cancel clear"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(index)}
                        className="p-1 text-red-500 hover:text-red-600"
                        title="Clear hole scores"
                      >
                        🗑️
                      </button>
                    )
                  )}
                </div>
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