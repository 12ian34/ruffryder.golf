import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';
import { calculateGamePoints } from '../utils/gamePoints';
import { useHoleDistances } from '../hooks/useHoleDistances';

interface ScoreEntryProps {
  gameId: string;
  tournamentId: string;
  onClose: () => void;
  onSave?: () => void;
  useHandicaps?: boolean;
}

export default function ScoreEntry({ gameId, tournamentId, onClose, onSave, useHandicaps = false }: ScoreEntryProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<Array<{ USA: number | '', EUROPE: number | '' }>>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<number | null>(null);
  const { distances, isLoading: isLoadingDistances, error: distancesError } = useHoleDistances();

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

        if (!isMounted) {
          return;
        }

        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as Game;
        const tournamentData = tournamentDoc.data();
        const indices = strokeIndicesDoc.data()?.indices || [];

        // Update game data with tournament settings if needed
        if (tournamentData?.useHandicaps && (!gameData.handicapStrokes || gameData.handicapStrokes === 0)) {
          const [usaPlayerDoc, europePlayerDoc] = await Promise.all([
            getDoc(doc(db, 'players', gameData.usaPlayerId)),
            getDoc(doc(db, 'players', gameData.europePlayerId))
          ]);

          const usaHandicap = usaPlayerDoc.exists() ? usaPlayerDoc.data().averageScore : 0;
          const europeHandicap = europePlayerDoc.exists() ? europePlayerDoc.data().averageScore : 0;
          
          const handicapDiff = Math.abs(usaHandicap - europeHandicap);
          const higherHandicapTeam = usaHandicap > europeHandicap ? 'USA' : 'EUROPE';

          gameData.handicapStrokes = handicapDiff;
          gameData.higherHandicapTeam = higherHandicapTeam;
          
          await updateDoc(doc(db, 'tournaments', tournamentId, 'games', gameId), {
            handicapStrokes: handicapDiff,
            higherHandicapTeam: higherHandicapTeam
          });
        }

        // Initialize scores from game data
        if (!gameData || !Array.isArray(gameData.holes)) {
            throw new Error('Invalid game data structure: holes array missing or invalid.');
        }
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

    return () => {
      isMounted = false;
    };
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

  // Calculate score totals
  const getTotals = () => {
    const front9USA = scores.slice(0, 9).reduce((sum, hole) => sum + (typeof hole.USA === 'number' ? hole.USA : 0), 0);
    const front9Europe = scores.slice(0, 9).reduce((sum, hole) => sum + (typeof hole.EUROPE === 'number' ? hole.EUROPE : 0), 0);
    const back9USA = scores.slice(9).reduce((sum, hole) => sum + (typeof hole.USA === 'number' ? hole.USA : 0), 0);
    const back9Europe = scores.slice(9).reduce((sum, hole) => sum + (typeof hole.EUROPE === 'number' ? hole.EUROPE : 0), 0);
    const totalUSA = front9USA + back9USA;
    const totalEurope = front9Europe + back9Europe;

    return {
      front9USA,
      front9Europe,
      back9USA,
      back9Europe,
      totalUSA,
      totalEurope
    };
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div data-testid="loading-spinner" className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xl relative flex flex-col max-h-[90vh]">
        <style>
          {`
            /* Hide default number input spinners */
            input[type="number"]::-webkit-outer-spin-button,
            input[type="number"]::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type="number"] {
              -moz-appearance: textfield;
            }
          `}
        </style>
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Enter Scores</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-2"
              aria-label="Close score entry"
            >
              ×
            </button>
          </div>

          <div className="flex justify-between items-center">
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {game.holes.map((hole, index) => {
              // Calculate if this hole gets a stroke
              const strokesForHole = Math.floor(game.handicapStrokes / 18) + 
                (hole.strokeIndex <= (game.handicapStrokes % 18) ? 1 : 0);
              const showStrokeIndicator = game.higherHandicapTeam !== 'USA' && strokesForHole > 0;

              return (
                <div key={hole.holeNumber} className="grid grid-cols-[60px_1fr_32px] gap-2 items-center">
                  <div className="text-sm">
                    <div className="font-medium dark:text-white">Hole {hole.holeNumber}</div>
                    {useHandicaps && (
                      <div className="text-gray-500 dark:text-gray-400">
                        SI: {strokeIndices[index] ?? '-'}
                      </div>
                    )}
                    {isLoadingDistances ? (
                      <div className="text-gray-400 dark:text-gray-500">
                        Loading...
                      </div>
                    ) : distances[index] ? (
                      <div className="text-gray-500 dark:text-gray-400">
                        {distances[index]}yd
                      </div>
                    ) : null}
                    {useHandicaps && showStrokeIndicator && (
                      <div className="text-xs text-purple-500">+{strokesForHole} stroke{strokesForHole > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="1"
                        max="20"
                        value={scores[index].USA}
                        onChange={(e) => handleScoreChange(index, 'USA', e.target.value)}
                        className="w-full h-12 pl-3 pr-10 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg appearance-none"
                        placeholder="USA"
                      />
                      <div className="absolute right-0 inset-y-0 w-10 flex flex-col divide-y dark:divide-gray-600">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400 border-l dark:border-gray-600 transition-all duration-150 group active:bg-green-50 dark:active:bg-green-900/20"
                          onClick={(e) => {
                            e.preventDefault();
                            const currentValue = scores[index].USA;
                            const newValue = typeof currentValue === 'number' ? 
                              (currentValue < 20 ? currentValue + 1 : currentValue) : 1;
                            handleScoreChange(index, 'USA', newValue.toString());
                          }}
                          aria-label={`Increment USA score for hole ${hole.holeNumber}`}
                        >
                          <svg 
                            className="w-4 h-4 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 border-l dark:border-gray-600 transition-all duration-150 group active:bg-red-50 dark:active:bg-red-900/20"
                          onClick={(e) => {
                            e.preventDefault();
                            const currentValue = scores[index].USA;
                            const newValue = typeof currentValue === 'number' ? 
                              (currentValue > 1 ? currentValue - 1 : currentValue) : '';
                            handleScoreChange(index, 'USA', newValue.toString());
                          }}
                          aria-label={`Decrement USA score for hole ${hole.holeNumber}`}
                        >
                          <svg 
                            className="w-4 h-4 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="1"
                        max="20"
                        value={scores[index].EUROPE}
                        onChange={(e) => handleScoreChange(index, 'EUROPE', e.target.value)}
                        className="w-full h-12 pl-3 pr-10 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg appearance-none"
                        placeholder="EUR"
                      />
                      <div className="absolute right-0 inset-y-0 w-10 flex flex-col divide-y dark:divide-gray-600">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400 border-l dark:border-gray-600 transition-all duration-150 group active:bg-green-50 dark:active:bg-green-900/20"
                          onClick={(e) => {
                            e.preventDefault();
                            const currentValue = scores[index].EUROPE;
                            const newValue = typeof currentValue === 'number' ? 
                              (currentValue < 20 ? currentValue + 1 : currentValue) : 1;
                            handleScoreChange(index, 'EUROPE', newValue.toString());
                          }}
                          aria-label={`Increment EUROPE score for hole ${hole.holeNumber}`}
                        >
                          <svg 
                            className="w-4 h-4 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 border-l dark:border-gray-600 transition-all duration-150 group active:bg-red-50 dark:active:bg-red-900/20"
                          onClick={(e) => {
                            e.preventDefault();
                            const currentValue = scores[index].EUROPE;
                            const newValue = typeof currentValue === 'number' ? 
                              (currentValue > 1 ? currentValue - 1 : currentValue) : '';
                            handleScoreChange(index, 'EUROPE', newValue.toString());
                          }}
                          aria-label={`Decrement EUROPE score for hole ${hole.holeNumber}`}
                        >
                          <svg 
                            className="w-4 h-4 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {(scores[index].USA !== '' || scores[index].EUROPE !== '') && (
                      <div className="relative">
                        {showClearConfirm === index ? (
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 transition-all duration-200 animate-fade-in">
                            <button
                              onClick={() => handleClearHole(index)}
                              className="p-1.5 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors duration-150 group"
                              title="Confirm clear"
                              aria-label={`Confirm clear scores for hole ${hole.holeNumber}`}
                            >
                              <svg 
                                className="w-4 h-4 transform group-hover:scale-105 transition-transform" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setShowClearConfirm(null)}
                              className="p-1.5 text-white bg-gray-400 hover:bg-gray-500 rounded-md transition-colors duration-150 group"
                              title="Cancel clear"
                              aria-label={`Cancel clear scores for hole ${hole.holeNumber}`}
                            >
                              <svg 
                                className="w-4 h-4 transform group-hover:scale-105 transition-transform" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowClearConfirm(index)}
                            className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-all duration-150 group rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Clear hole scores"
                            aria-label={`Clear scores for hole ${hole.holeNumber}`}
                          >
                            <svg 
                              className="w-5 h-5 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Score Totals */}
          {scores.length > 0 && (
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Score Totals</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Front 9:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-red-500">{getTotals().front9USA}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm font-medium text-purple-500">{getTotals().front9Europe}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Back 9:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-red-500">{getTotals().back9USA}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm font-medium text-purple-500">{getTotals().back9Europe}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-red-500">{getTotals().totalUSA}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm font-medium text-purple-500">{getTotals().totalEurope}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Difference:</span>
                    <span className={`text-sm font-medium ${getTotals().totalUSA < getTotals().totalEurope ? 'text-red-500' : (getTotals().totalUSA > getTotals().totalEurope ? 'text-purple-500' : 'text-gray-500')}`}>
                      {getTotals().totalUSA < getTotals().totalEurope 
                        ? `USA ahead by ${getTotals().totalEurope - getTotals().totalUSA}` 
                        : (getTotals().totalUSA > getTotals().totalEurope 
                          ? `Europe ahead by ${getTotals().totalUSA - getTotals().totalEurope}` 
                          : 'Tied')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t dark:border-gray-700">
          {distancesError && (
            <div className="text-sm text-red-500 mb-2">
              Error loading hole distances: {distancesError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Cancel score entry"
            >
              Cancel
            </button>
            <button
              onClick={handleScoreSubmit}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              aria-label="Save scores"
            >
              {isLoading ? 'Saving...' : 'Save Scores'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}