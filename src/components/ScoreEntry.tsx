import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import { updateTournamentScores } from '../utils/tournamentScores';
import { calculateGamePoints } from '../utils/gamePoints';
import { useHoleDistances } from '../hooks/useHoleDistances';
import { track } from '../utils/analytics';

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
  const [savedScores, setSavedScores] = useState<Array<{ USA: number | '', EUROPE: number | '' }>>([]);
  const [strokeIndices, setStrokeIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<number | null>(null);
  const { distances, isLoading: isLoadingDistances, error: distancesError } = useHoleDistances();
  const [invalidScores, setInvalidScores] = useState<{[key: string]: boolean}>({});
  const [changedHoles, setChangedHoles] = useState<{[key: number]: boolean}>({});
  const [savingHole, setSavingHole] = useState<number | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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

  // Toast timeout handler
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Track modal view
  useEffect(() => {
    if (game) {
      track('score_entry_modal_viewed', {
        gameId,
        tournamentId,
        usaPlayerName: game.usaPlayerName,
        europePlayerName: game.europePlayerName
      });
    }
  }, [gameId, tournamentId, game]);

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

        // Get the effective useHandicaps value from either the prop, game data, or tournament data
        const effectiveUseHandicaps = useHandicaps || 
          gameData.useHandicaps || 
          tournamentData?.useHandicaps || 
          false;

        // Update game data with tournament settings if needed
        if (effectiveUseHandicaps && (!gameData.handicapStrokes || gameData.handicapStrokes === 0)) {
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
          
          // Set useHandicaps to true on the game since we're calculating handicaps
          gameData.useHandicaps = true;

          await updateDoc(doc(db, 'tournaments', tournamentId, 'games', gameId), {
            handicapStrokes: handicapDiff,
            higherHandicapTeam: higherHandicapTeam,
            useHandicaps: true
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
        setSavedScores([...initialScores]);
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

  // Helper function to check if scores are different from saved
  const areScoresDifferent = (index: number) => {
    if (!savedScores[index]) return false;
    
    return scores[index].USA !== savedScores[index].USA || 
           scores[index].EUROPE !== savedScores[index].EUROPE;
  };

  const handleScoreChange = (holeIndex: number, team: 'USA' | 'EUROPE', value: string) => {
    // Always update the display value first
    const newScores = [...scores];
    newScores[holeIndex] = {
      ...newScores[holeIndex],
      [team]: value
    };
    setScores(newScores);

    // Mark this hole as changed only if values are different from saved values
    const isDifferent = team === 'USA' 
      ? value !== savedScores[holeIndex]?.USA.toString()
      : value !== savedScores[holeIndex]?.EUROPE.toString();

    setChangedHoles(prev => ({
      ...prev,
      [holeIndex]: isDifferent || areScoresDifferent(holeIndex)
    }));

    // If the value is empty, clear validation state
    if (value === '') {
      setInvalidScores(prev => ({
        ...prev,
        [`${holeIndex}-${team}`]: false
      }));
      setError(null);
      return;
    }

    // Check for non-numeric input
    if (!/^\d+$/.test(value)) {
      setInvalidScores(prev => ({
        ...prev,
        [`${holeIndex}-${team}`]: true
      }));
      setError('Only numbers are allowed');
      return;
    }

    const numValue = parseInt(value);
    
    // Validate the numeric value
    if (numValue < 1 || numValue > 20) {
      setInvalidScores(prev => ({
        ...prev,
        [`${holeIndex}-${team}`]: true
      }));
      setError('Score must be between 1 and 20');
      return;
    }

    // Valid score, update with the parsed number
    newScores[holeIndex] = {
      ...newScores[holeIndex],
      [team]: numValue
    };
    setScores(newScores);
    setInvalidScores(prev => ({
      ...prev,
      [`${holeIndex}-${team}`]: false
    }));
    setError(null);
  };

  const handleClearHole = (index: number) => {
    const newScores = [...scores];
    newScores[index] = {
      USA: '',
      EUROPE: ''
    };
    setScores(newScores);
    setShowClearConfirm(null);
    
    // Track score deletion event
    if (game) {
      track('score_deleted', {
        gameId,
        tournamentId,
        holeNumber: game.holes[index].holeNumber
      });
    }
  };

  const handleSaveHole = async (index: number) => {
    if (!game) return;

    const holeScores = scores[index];
    
    // Check for invalid scores for this hole
    const usaInvalid = typeof holeScores.USA === 'string' && (!/^\d+$/.test(holeScores.USA) || parseInt(holeScores.USA) < 1 || parseInt(holeScores.USA) > 20);
    const europeInvalid = typeof holeScores.EUROPE === 'string' && (!/^\d+$/.test(holeScores.EUROPE) || parseInt(holeScores.EUROPE) < 1 || parseInt(holeScores.EUROPE) > 20);
    
    if ((holeScores.USA !== '' && usaInvalid) || (holeScores.EUROPE !== '' && europeInvalid)) {
      setError('Please correct invalid scores (must be between 1 and 20) before saving');
      return;
    }

    try {
      setSavingHole(index);
      setError(null);

      // Get current data for the hole
      const usaScore = typeof holeScores.USA === 'number' ? holeScores.USA : null;
      const europeScore = typeof holeScores.EUROPE === 'number' ? holeScores.EUROPE : null;

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
        // and the hole index is within the range of holes that should get extra strokes
        const getsExtraStroke = strokeIndices[index] <= extraStrokeHoles && 
                              extraStrokeHoles > 0;
        
        // Total strokes for this hole
        const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);

        // Add handicap strokes to the opponent of the higher handicap team (worse player)
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

      // Update just the specific hole
      const updatedHole = {
        ...game.holes[index],
        usaPlayerScore: usaScore,
        europePlayerScore: europeScore,
        usaPlayerAdjustedScore: usaAdjustedScore,
        europePlayerAdjustedScore: europeAdjustedScore,
        usaPlayerMatchPlayScore: usaMatchPlayScore,
        europePlayerMatchPlayScore: europeMatchPlayScore,
        usaPlayerMatchPlayAdjustedScore: usaMatchPlayAdjustedScore,
        europePlayerMatchPlayAdjustedScore: europeMatchPlayAdjustedScore
      };

      // Create a copy of all holes with the update
      const updatedHoles = [...game.holes];
      updatedHoles[index] = updatedHole;

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

      // Check if all holes have scores
      const isComplete = updatedHoles.every(hole => 
        hole.usaPlayerScore !== null && hole.europePlayerScore !== null
      );

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

      // Update local game state
      setGame(updatedGame);
      
      // Update saved scores for this hole
      const newSavedScores = [...savedScores];
      newSavedScores[index] = { ...scores[index] };
      setSavedScores(newSavedScores);
      
      // Clear the changed state for this hole
      setChangedHoles(prev => ({
        ...prev,
        [index]: false
      }));

      // Track score saved event
      track('score_saved', {
        gameId,
        tournamentId,
        holeNumber: game.holes[index].holeNumber,
        usaScore: scores[index].USA,
        europeScore: scores[index].EUROPE
      });

      // Show success toast
      setShowToast({
        message: `Scores saved for hole ${game.holes[index].holeNumber}`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error saving hole scores:', error);
      setShowToast({
        message: 'Failed to save scores for this hole',
        type: 'error'
      });
    } finally {
      setSavingHole(null);
    }
  };

  // Handle saving all scores
  const handleScoreSubmit = async () => {
    if (!game) return;

    // Check for any invalid scores
    const hasInvalidScores = scores.some((score) => {
      const usaInvalid = typeof score.USA === 'string' && (!/^\d+$/.test(score.USA) || parseInt(score.USA) < 1 || parseInt(score.USA) > 20);
      const europeInvalid = typeof score.EUROPE === 'string' && (!/^\d+$/.test(score.EUROPE) || parseInt(score.EUROPE) < 1 || parseInt(score.EUROPE) > 20);
      return (score.USA !== '' && usaInvalid) || (score.EUROPE !== '' && europeInvalid);
    });

    if (hasInvalidScores) {
      setError('Please correct invalid scores (must be between 1 and 20) before saving');
      return;
    }

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
          // and the hole index is within the range of holes that should get extra strokes
          const getsExtraStroke = strokeIndices[index] <= extraStrokeHoles && 
                                extraStrokeHoles > 0;
          
          // Total strokes for this hole
          const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);

          // Add handicap strokes to the opponent of the higher handicap team (worse player)
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
      const isComplete = updatedHoles.every(hole => 
        hole.usaPlayerScore !== null && hole.europePlayerScore !== null
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

      // Update local game state
      setGame(updatedGame);
      
      // Update all saved scores
      setSavedScores([...scores]);
      
      // Clear all changed states
      setChangedHoles({});

      // Show success toast
      setShowToast({
        message: 'All scores saved successfully',
        type: 'success'
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving scores:', error);
      setShowToast({
        message: 'Failed to save scores',
        type: 'error'
      });
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

  // Calculate holes won (match play scores) based on current scores
  const getHolesWon = () => {
    if (!game) return { usaHolesWon: 0, europeHolesWon: 0, usaAdjustedHolesWon: 0, europeAdjustedHolesWon: 0 };
    
    let usaHolesWon = 0;
    let europeHolesWon = 0;
    let usaAdjustedHolesWon = 0;
    let europeAdjustedHolesWon = 0;
    
    // For front 9 / back 9 breakdowns
    let usaFront9HolesWon = 0;
    let europeFront9HolesWon = 0;
    let usaBack9HolesWon = 0;
    let europeBack9HolesWon = 0;
    let usaAdjustedFront9HolesWon = 0;
    let europeAdjustedFront9HolesWon = 0;
    let usaAdjustedBack9HolesWon = 0;
    let europeAdjustedBack9HolesWon = 0;

    scores.forEach((holeScore, index) => {
      // Only count completed holes
      if (typeof holeScore.USA === 'number' && typeof holeScore.EUROPE === 'number') {
        const isFront9 = index < 9;
        
        // Regular match play (without handicap)
        if (holeScore.USA < holeScore.EUROPE) {
          usaHolesWon++;
          if (isFront9) usaFront9HolesWon++;
          else usaBack9HolesWon++;
        } else if (holeScore.EUROPE < holeScore.USA) {
          europeHolesWon++;
          if (isFront9) europeFront9HolesWon++;
          else europeBack9HolesWon++;
        }

        // Match play with handicap
        if (useHandicaps && game.handicapStrokes > 0) {
          // Calculate strokes for this hole
          const baseStrokes = Math.floor(game.handicapStrokes / 18);
          const extraStrokeHoles = game.handicapStrokes % 18;
          const getsExtraStroke = strokeIndices[index] <= extraStrokeHoles && extraStrokeHoles > 0;
          const strokesForHole = baseStrokes + (getsExtraStroke ? 1 : 0);
          
          // Apply handicap strokes
          let usaAdjustedScore = holeScore.USA;
          let europeAdjustedScore = holeScore.EUROPE;
          
          if (game.higherHandicapTeam === 'USA') {
            usaAdjustedScore = holeScore.USA;
            europeAdjustedScore = holeScore.EUROPE + strokesForHole;
          } else {
            usaAdjustedScore = holeScore.USA + strokesForHole;
            europeAdjustedScore = holeScore.EUROPE;
          }
          
          // Calculate adjusted match play
          if (usaAdjustedScore < europeAdjustedScore) {
            usaAdjustedHolesWon++;
            if (isFront9) usaAdjustedFront9HolesWon++;
            else usaAdjustedBack9HolesWon++;
          } else if (europeAdjustedScore < usaAdjustedScore) {
            europeAdjustedHolesWon++;
            if (isFront9) europeAdjustedFront9HolesWon++;
            else europeAdjustedBack9HolesWon++;
          }
        }
      }
    });

    return {
      usaHolesWon,
      europeHolesWon,
      usaAdjustedHolesWon,
      europeAdjustedHolesWon,
      usaFront9HolesWon,
      europeFront9HolesWon,
      usaBack9HolesWon,
      europeBack9HolesWon,
      usaAdjustedFront9HolesWon,
      europeAdjustedFront9HolesWon,
      usaAdjustedBack9HolesWon,
      europeAdjustedBack9HolesWon
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

  if (!game) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-red-500">Game not found</p>
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
    <div className="w-full">
      {/* Toast notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium z-50 transition-opacity duration-300 ${
          showToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {showToast.message}
        </div>
      )}
      
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-950 dark:to-black rounded-lg shadow-xl border border-gray-700 dark:border-gray-800 w-full relative flex flex-col overflow-hidden">
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
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-900/90 to-gray-950/90 dark:from-gray-950/90 dark:to-black/90 backdrop-blur-md px-6 py-2 border-b border-gray-700/50 dark:border-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="w-[40%] text-center">
              <div className="font-medium text-usa-500 text-lg">
                {game.usaPlayerName}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-400">USA</div>
            </div>
            <div className="text-2xl text-gray-500 dark:text-gray-600">vs</div>
            <div className="w-[40%] text-center">
              <div className="font-medium text-europe-500 text-lg">
                {game.europePlayerName}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-400">EUROPE</div>
            </div>
          </div>

          {/* {useHandicaps && game.handicapStrokes > 0 && (
            <div className="mt-2 text-center">
              <div className="inline-block px-3 py-1 bg-purple-900/30 dark:bg-purple-900/20 rounded-md text-sm text-purple-300 dark:text-purple-300 font-medium">
                Handicap scoring is active
              </div>
            </div>
          )} */}

          {/* {game && (
            <div className="mt-2">
              <HandicapDisplay game={game} useHandicaps={useHandicaps} />
            </div>
          )} */}

          {/* Score difference indicator in header */}
          {scores.length > 0 && (
            <div className="mt-2 text-center space-y-1">
              {(() => {
                if (useHandicaps && game.handicapStrokes > 0) {
                  // Calculate adjusted totals
                  const totals = { ...getTotals() };
                  const teamWithStrokesAdded = game.higherHandicapTeam === 'USA' ? 'EUROPE' : 'USA';
                  
                  // Calculate total handicap strokes for completed holes
                  let totalHandicapStrokes = 0;
                  for (let i = 0; i < scores.length; i++) {
                    if (scores[i].USA !== '' && scores[i].EUROPE !== '') {
                      const baseStrokes = Math.floor(game.handicapStrokes / 18);
                      const extraStrokeHoles = game.handicapStrokes % 18;
                      const getsExtraStroke = strokeIndices[i] <= extraStrokeHoles && extraStrokeHoles > 0;
                      totalHandicapStrokes += baseStrokes + (getsExtraStroke ? 1 : 0);
                    }
                  }
                  
                  // Apply handicap strokes to the right team
                  if (teamWithStrokesAdded === 'USA') {
                    totals.totalUSA += totalHandicapStrokes;
                  } else {
                    totals.totalEurope += totalHandicapStrokes;
                  }
                  
                  // Determine which team is ahead in stroke play with handicap
                  // In golf, lower score is better
                  const isUsaAhead = totals.totalUSA < totals.totalEurope;
                  const isEuropeAhead = totals.totalUSA > totals.totalEurope;
                  const scoreDifference = Math.abs(totals.totalUSA - totals.totalEurope);
                  
                  // Calculate match play holes (with handicap) using current scores
                  const { usaAdjustedHolesWon, europeAdjustedHolesWon } = getHolesWon();
                  const isUsaHolesAhead = usaAdjustedHolesWon > europeAdjustedHolesWon;
                  const isEuropeHolesAhead = europeAdjustedHolesWon > usaAdjustedHolesWon;
                  const holesDifference = Math.abs(usaAdjustedHolesWon - europeAdjustedHolesWon);
                  
                  return (
                    <>
                      {/* Strokes difference with handicap */}
                      {isEuropeAhead && scoreDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-europe-500/20 rounded-md text-sm text-europe-300 font-medium">
                          Europe ahead by {scoreDifference} strokes (with handicap)
                        </div>
                      ) : isUsaAhead && scoreDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-usa-500/20 rounded-md text-sm text-usa-300 font-medium">
                          USA ahead by {scoreDifference} strokes (with handicap)
                        </div>
                      ) : (
                        <div className="inline-block px-3 py-1 bg-gray-700/30 rounded-md text-sm text-gray-300 font-medium">
                          Tied on strokes
                        </div>
                      )}
                      
                      {/* Holes difference with handicap */}
                      {isEuropeHolesAhead && holesDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-europe-500/20 rounded-md text-sm text-europe-300 font-medium">
                          Europe ahead by {holesDifference} holes (with handicap)
                        </div>
                      ) : isUsaHolesAhead && holesDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-usa-500/20 rounded-md text-sm text-usa-300 font-medium">
                          USA ahead by {holesDifference} holes (with handicap)
                        </div>
                      ) : (usaAdjustedHolesWon > 0 || europeAdjustedHolesWon > 0) ? (
                        <div className="inline-block px-3 py-1 bg-gray-700/30 rounded-md text-sm text-gray-300 font-medium">
                          Tied on holes
                        </div>
                      ) : null}
                    </>
                  );
                } else {
                  // Get raw score totals
                  const { totalUSA, totalEurope } = getTotals();
                  
                  // In golf, lower score is better
                  const isUsaAhead = totalUSA < totalEurope;
                  const isEuropeAhead = totalUSA > totalEurope;
                  const scoreDifference = Math.abs(totalUSA - totalEurope);
                  
                  // Calculate match play holes (without handicap) using current scores
                  const { usaHolesWon, europeHolesWon } = getHolesWon();
                  const isUsaHolesAhead = usaHolesWon > europeHolesWon;
                  const isEuropeHolesAhead = europeHolesWon > usaHolesWon;
                  const holesDifference = Math.abs(usaHolesWon - europeHolesWon);
                  
                  return (
                    <>
                      {/* Strokes difference without handicap */}
                      {isEuropeAhead && scoreDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-europe-500/20 rounded-md text-sm text-europe-300 font-medium">
                          Europe ahead by {scoreDifference} strokes
                        </div>
                      ) : isUsaAhead && scoreDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-usa-500/20 rounded-md text-sm text-usa-300 font-medium">
                          USA ahead by {scoreDifference} strokes
                        </div>
                      ) : totalUSA > 0 || totalEurope > 0 ? (
                        <div className="inline-block px-3 py-1 bg-gray-700/30 rounded-md text-sm text-gray-300 font-medium">
                          Tied on strokes
                        </div>
                      ) : null}
                      
                      {/* Holes difference without handicap */}
                      {isEuropeHolesAhead && holesDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-europe-500/20 rounded-md text-sm text-europe-300 font-medium">
                          Europe ahead by {holesDifference} holes
                        </div>
                      ) : isUsaHolesAhead && holesDifference > 0 ? (
                        <div className="inline-block px-3 py-1 bg-usa-500/20 rounded-md text-sm text-usa-300 font-medium">
                          USA ahead by {holesDifference} holes
                        </div>
                      ) : (usaHolesWon > 0 || europeHolesWon > 0) ? (
                        <div className="inline-block px-3 py-1 bg-gray-700/30 rounded-md text-sm text-gray-300 font-medium">
                          Tied on holes
                        </div>
                      ) : null}
                    </>
                  );
                }
              })()}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 pb-6 bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-950 dark:to-black text-gray-200">
          <div className="space-y-3">
            {game.holes.map((hole, index) => {
              // Calculate if this hole gets a stroke
              const strokesForHole = Math.floor(game.handicapStrokes / 18) + 
                (strokeIndices[index] <= (game.handicapStrokes % 18) && (game.handicapStrokes % 18) > 0 ? 1 : 0);
              const showStrokeIndicator = useHandicaps && strokesForHole > 0; // Only show if handicaps are enabled
              const teamWithStrokesAdded = game.higherHandicapTeam === 'USA' ? 'EUROPE' : 'USA';
              const strokeColor = teamWithStrokesAdded === 'USA' ? 'text-usa-500' : 'text-europe-500';
              
              // Determine winner for row highlighting
              let rowHighlightClass = '';
              
              // Only calculate winner if both scores are present
              if (typeof scores[index].USA === 'number' && typeof scores[index].EUROPE === 'number') {
                if (useHandicaps && game.handicapStrokes > 0) {
                  // Use adjusted scores for determining winner when handicaps are on
                  let usaAdjustedScore = scores[index].USA;
                  let europeAdjustedScore = scores[index].EUROPE;
                  
                  // Apply handicap strokes
                  if (teamWithStrokesAdded === 'USA') {
                    usaAdjustedScore = scores[index].USA + strokesForHole;
                  } else {
                    europeAdjustedScore = scores[index].EUROPE + strokesForHole;
                  }
                  
                  // Determine winner based on adjusted scores
                  if (usaAdjustedScore < europeAdjustedScore) {
                    rowHighlightClass = 'bg-usa-500/20 border-l-4 border-usa-500';
                  } else if (europeAdjustedScore < usaAdjustedScore) {
                    rowHighlightClass = 'bg-europe-500/20 border-l-4 border-europe-500';
                  } else {
                    rowHighlightClass = 'bg-gray-500/15 border-l-4 border-gray-500';
                  }
                } else {
                  // When handicaps are off, use raw scores
                  if (scores[index].USA < scores[index].EUROPE) {
                    rowHighlightClass = 'bg-usa-500/20 border-l-4 border-usa-500';
                  } else if (scores[index].EUROPE < scores[index].USA) {
                    rowHighlightClass = 'bg-europe-500/20 border-l-4 border-europe-500';
                  } else {
                    rowHighlightClass = 'bg-gray-500/15 border-l-4 border-gray-500';
                  }
                }
              }

              return (
                <div key={hole.holeNumber} 
                  className={`grid grid-cols-[50px_1fr_28px] sm:grid-cols-[60px_1fr_32px] gap-2 sm:gap-3 items-center py-1 border-b border-gray-800/50 dark:border-gray-800/30 last:border-0 ${rowHighlightClass} rounded-md pl-2`}
                  data-hole-index={index}>
                  <div className="text-sm">
                    <div className="font-medium text-gray-200">Hole {hole.holeNumber}</div>
                    <div className="text-gray-400">
                      SI: {strokeIndices[index] ?? '-'}
                    </div>
                    {isLoadingDistances ? (
                      <div className="text-gray-500">
                        Loading...
                      </div>
                    ) : distances[index] ? (
                      <div className="text-gray-400">
                        {distances[index]}yd
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="relative group">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scores[index].USA}
                        onChange={(e) => handleScoreChange(index, 'USA', e.target.value)}
                        className={`w-full h-10 sm:h-12 pl-2 sm:pl-3 pr-10 py-1 sm:py-2 rounded-lg border ${
                          invalidScores[`${index}-USA`] 
                            ? 'border-red-500 bg-red-900/20' 
                            : 'bg-gray-800/50 border-gray-700 focus:border-usa-500/70 group-hover:border-gray-600'
                        } text-white text-center text-base sm:text-lg appearance-none transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-usa-500/50`}
                        placeholder="USA"
                        tabIndex={index * 2 + 1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            const nextInput = document.querySelector(`[tabindex="${index * 2 + 2}"]`) as HTMLElement;
                            nextInput?.focus();
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            if (index > 0) {
                              const prevInput = document.querySelector(`[tabindex="${index * 2}"]`) as HTMLElement;
                              prevInput?.focus();
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (index > 0) {
                              const prevInput = document.querySelector(`[tabindex="${(index - 1) * 2 + 1}"]`) as HTMLElement;
                              prevInput?.focus();
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (index < scores.length - 1) {
                              const nextInput = document.querySelector(`[tabindex="${(index + 1) * 2 + 1}"]`) as HTMLElement;
                              nextInput?.focus();
                            }
                          }
                        }}
                      />
                      <div className="absolute right-0 inset-y-0 w-10 flex flex-col divide-y divide-gray-700/70">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-500 hover:text-usa-400 border-l border-gray-700/70 transition-all duration-150 group-hover:border-gray-600 active:bg-usa-900/20 rounded-tr-lg"
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
                          className="flex-1 flex items-center justify-center text-gray-500 hover:text-red-400 border-l border-gray-700/70 transition-all duration-150 group-hover:border-gray-600 active:bg-red-900/20 rounded-br-lg"
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
                    <div className="relative group">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scores[index].EUROPE}
                        onChange={(e) => handleScoreChange(index, 'EUROPE', e.target.value)}
                        className={`w-full h-10 sm:h-12 pl-2 sm:pl-3 pr-10 py-1 sm:py-2 rounded-lg border ${
                          invalidScores[`${index}-EUROPE`] 
                            ? 'border-red-500 bg-red-900/20' 
                            : 'bg-gray-800/50 border-gray-700 focus:border-europe-500/70 group-hover:border-gray-600'
                        } text-white text-center text-base sm:text-lg appearance-none transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-europe-500/50`}
                        placeholder="EUR"
                        tabIndex={index * 2 + 2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            if (index < scores.length - 1) {
                              const nextInput = document.querySelector(`[tabindex="${(index + 1) * 2 + 1}"]`) as HTMLElement;
                              nextInput?.focus();
                            }
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            const prevInput = document.querySelector(`[tabindex="${index * 2 + 1}"]`) as HTMLElement;
                            prevInput?.focus();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (index > 0) {
                              const prevInput = document.querySelector(`[tabindex="${(index - 1) * 2 + 2}"]`) as HTMLElement;
                              prevInput?.focus();
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (index < scores.length - 1) {
                              const nextInput = document.querySelector(`[tabindex="${(index + 1) * 2 + 2}"]`) as HTMLElement;
                              nextInput?.focus();
                            }
                          }
                        }}
                      />
                      <div className="absolute right-0 inset-y-0 w-10 flex flex-col divide-y divide-gray-700/70">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center text-gray-500 hover:text-europe-400 border-l border-gray-700/70 transition-all duration-150 group-hover:border-gray-600 active:bg-europe-900/20 rounded-tr-lg"
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
                          className="flex-1 flex items-center justify-center text-gray-500 hover:text-red-400 border-l border-gray-700/70 transition-all duration-150 group-hover:border-gray-600 active:bg-red-900/20 rounded-br-lg"
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
                    {showStrokeIndicator && (
                      <div className={`col-span-2 text-xs text-center ${strokeColor} font-medium`}>
                        (+{strokesForHole} stroke(s) will be added to {teamWithStrokesAdded})
                      </div>
                    )}
                  </div>
                  
                  {/* Save and Clear hole buttons */}
                  <div className="flex items-center justify-center relative">
                    {showClearConfirm === index ? (
                      <div className="flex gap-1.5 items-center animate-fade-in absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-gray-800/90 backdrop-blur-sm p-1 rounded-md shadow-lg border border-gray-700/50">
                        <button
                          onClick={() => handleClearHole(index)}
                          className="p-1.5 text-white bg-gradient-to-br from-red-600 to-red-700 rounded-md shadow-sm hover:shadow-md transition-all duration-150 group transform hover:scale-105 active:scale-95"
                          title="Confirm clear"
                          aria-label={`Confirm clear scores for hole ${hole.holeNumber}`}
                        >
                          <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(null)}
                          className="p-1.5 text-white bg-gradient-to-br from-gray-600 to-gray-700 rounded-md shadow-sm hover:shadow-md transition-all duration-150 group transform hover:scale-105 active:scale-95"
                          title="Cancel clear"
                          aria-label={`Cancel clear scores for hole ${hole.holeNumber}`}
                        >
                          <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {/* Save button - only shown when hole has unsaved changes that don't match saved values */}
                        {changedHoles[index] && areScoresDifferent(index) && (
                          <button
                            disabled={savingHole === index}
                            onClick={() => handleSaveHole(index)}
                            className="p-2 text-gray-500 hover:text-green-400 transition-all duration-200 group rounded-lg transform hover:scale-105 active:scale-95 relative"
                            title="Save hole scores"
                            aria-label={`Save scores for hole ${hole.holeNumber}`}
                          >
                            <svg 
                              className="w-5 h-5 transform group-hover:scale-110 group-active:scale-95 transition-transform duration-150" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-gray-400">save?</span>
                            {savingHole === index && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
                                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </button>
                        )}
                        
                        {/* Clear button */}
                        <button
                          onClick={() => setShowClearConfirm(index)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-all duration-200 group rounded-lg transform hover:scale-105 active:scale-95"
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Score Totals */}
          {scores.length > 0 && !useHandicaps && (
            <div className="mt-6 sm:mt-8 bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/50">
              <h3 className="text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Score Totals</h3>
              
              {/* Column headers for strokes */}
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-medium text-gray-500 w-[40%]"></span>
                <div className="flex items-center gap-3 justify-end w-[60%]">
                  <span className="text-xs font-medium text-usa-500 w-10 text-center">USA</span>
                  <span className="text-xs font-medium text-europe-500 w-10 text-center">EUROPE</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-400">Front 9:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-usa-400 w-10 text-center">{getTotals().front9USA}</span>
                      <span className="text-sm font-medium text-europe-400 w-10 text-center">{getTotals().front9Europe}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-400">Back 9:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-usa-400 w-10 text-center">{getTotals().back9USA}</span>
                      <span className="text-sm font-medium text-europe-400 w-10 text-center">{getTotals().back9Europe}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                    <span className="text-sm font-medium text-gray-400">Total:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-usa-400 w-10 text-center">{getTotals().totalUSA}</span>
                      <span className="text-sm font-medium text-europe-400 w-10 text-center">{getTotals().totalEurope}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium text-gray-300">Difference:</span>
                    <span className={`text-sm font-medium ${getTotals().totalUSA > getTotals().totalEurope ? 'text-europe-400' : (getTotals().totalUSA < getTotals().totalEurope ? 'text-usa-400' : 'text-gray-500')}`}>
                      {getTotals().totalUSA > getTotals().totalEurope 
                        ? `Europe ahead by ${getTotals().totalUSA - getTotals().totalEurope}` 
                        : (getTotals().totalUSA < getTotals().totalEurope 
                          ? `USA ahead by ${getTotals().totalEurope - getTotals().totalUSA}` 
                          : 'Tied')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Adjusted Score Totals (only shown when handicaps are on) */}
          {useHandicaps && game.handicapStrokes > 0 && scores.length > 0 && (
            <div className="mt-4 sm:mt-6 bg-purple-900/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-purple-800/30">
              <h3 className="text-base sm:text-lg font-medium text-purple-300 mb-2 sm:mb-3">Stroke play</h3>
              
              {/* Column headers for scores */}
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-medium text-gray-500 w-[40%]"></span>
                <div className="flex items-center gap-3 justify-end w-[60%]">
                  <span className="text-xs font-medium text-usa-500 w-10 text-center">USA</span>
                  <span className="text-xs font-medium text-europe-500 w-10 text-center">EUROPE</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  {(() => {
                    // Calculate adjusted totals
                    const totals = { ...getTotals() };
                    const teamWithStrokesAdded = game.higherHandicapTeam === 'USA' ? 'EUROPE' : 'USA';
                    
                    // Calculate strokes per hole
                    const baseStrokes = Math.floor(game.handicapStrokes / 18);
                    const extraStrokeHoles = game.handicapStrokes % 18;
                    
                    // Calculate strokes for front 9 and back 9
                    let front9Strokes = 0;
                    let back9Strokes = 0;
                    
                    for (let i = 0; i < 9; i++) {
                      // Only add strokes for holes that have scores entered
                      if (scores[i].USA !== '' && scores[i].EUROPE !== '') {
                        const holeIndex = i;
                        const getsExtraStroke = strokeIndices[holeIndex] <= extraStrokeHoles && extraStrokeHoles > 0;
                        front9Strokes += baseStrokes + (getsExtraStroke ? 1 : 0);
                      }
                    }
                    
                    for (let i = 9; i < 18; i++) {
                      // Only add strokes for holes that have scores entered
                      if (i < scores.length && scores[i].USA !== '' && scores[i].EUROPE !== '') {
                        const holeIndex = i;
                        const getsExtraStroke = strokeIndices[holeIndex] <= extraStrokeHoles && extraStrokeHoles > 0;
                        back9Strokes += baseStrokes + (getsExtraStroke ? 1 : 0);
                      }
                    }
                    
                    // Apply handicap strokes to the right team
                    if (teamWithStrokesAdded === 'USA') {
                      totals.front9USA += front9Strokes;
                      totals.back9USA += back9Strokes;
                      totals.totalUSA += (front9Strokes + back9Strokes);
                    } else {
                      totals.front9Europe += front9Strokes;
                      totals.back9Europe += back9Strokes;
                      totals.totalEurope += (front9Strokes + back9Strokes);
                    }
                    
                    // Get the original unadjusted totals for comparison
                    const unadjustedTotals = getTotals();
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-400">Front 9:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">
                              {totals.front9USA}
                              {teamWithStrokesAdded === 'USA' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.front9USA})</span>}
                            </span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">
                              {totals.front9Europe}
                              {teamWithStrokesAdded === 'EUROPE' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.front9Europe})</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-400">Back 9:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">
                              {totals.back9USA}
                              {teamWithStrokesAdded === 'USA' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.back9USA})</span>}
                            </span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">
                              {totals.back9Europe}
                              {teamWithStrokesAdded === 'EUROPE' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.back9Europe})</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center sm:hidden border-b border-purple-800/30 pb-2">
                          <span className="text-sm font-medium text-gray-400">Total:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">
                              {totals.totalUSA}
                              {teamWithStrokesAdded === 'USA' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.totalUSA})</span>}
                            </span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">
                              {totals.totalEurope}
                              {teamWithStrokesAdded === 'EUROPE' && <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.totalEurope})</span>}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  {(() => {
                    // Calculate adjusted totals
                    const totals = { ...getTotals() };
                    const teamWithStrokesAdded = game.higherHandicapTeam === 'USA' ? 'EUROPE' : 'USA';
                    
                    // Calculate total handicap strokes for completed holes
                    let totalHandicapStrokes = 0;
                    for (let i = 0; i < scores.length; i++) {
                      if (scores[i].USA !== '' && scores[i].EUROPE !== '') {
                        const baseStrokes = Math.floor(game.handicapStrokes / 18);
                        const extraStrokeHoles = game.handicapStrokes % 18;
                        const getsExtraStroke = strokeIndices[i] <= extraStrokeHoles && extraStrokeHoles > 0;
                        totalHandicapStrokes += baseStrokes + (getsExtraStroke ? 1 : 0);
                      }
                    }
                    
                    // Apply handicap strokes to the right team
                    if (teamWithStrokesAdded === 'USA') {
                      totals.totalUSA += totalHandicapStrokes;
                    } else {
                      totals.totalEurope += totalHandicapStrokes;
                    }
                    
                    // Determine which team is ahead in stroke play with handicap
                    // In golf, lower score is better
                    const isUsaAhead = totals.totalUSA < totals.totalEurope;
                    const isEuropeAhead = totals.totalUSA > totals.totalEurope;
                    const scoreDifference = Math.abs(totals.totalUSA - totals.totalEurope);
                    
                    // Get the original unadjusted totals for comparison
                    const unadjustedTotals = getTotals();
                    
                    return (
                      <>
                        <div className="hidden sm:flex justify-between items-center border-b border-purple-800/30 pb-2">
                          <span className="text-sm font-medium text-gray-400">Total:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">
                              {totals.totalUSA}
                              <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.totalUSA})</span>
                            </span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">
                              {totals.totalEurope}
                              <span className="text-xs text-gray-500 ml-1">({unadjustedTotals.totalEurope})</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 sm:hidden">
                          {teamWithStrokesAdded === 'USA' 
                            ? `+${totalHandicapStrokes} strokes added to USA` 
                            : `+${totalHandicapStrokes} strokes added to Europe`}
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-sm font-medium text-purple-300">Difference:</span>
                          <span className={`text-sm font-medium ${isEuropeAhead ? 'text-europe-400' : (isUsaAhead ? 'text-usa-400' : 'text-gray-500')}`}>
                            {isEuropeAhead
                              ? `Europe ahead by ${scoreDifference}` 
                              : (isUsaAhead
                                ? `USA ahead by ${scoreDifference}` 
                                : 'Tied')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Match Play Holes Won (With Handicap) */}
              <div className="mt-4 pt-3 border-t border-purple-800/30">
                <h4 className="text-base sm:text-lg font-medium text-purple-300 mb-2 sm:mb-3">Match play</h4>
                
                {/* Column headers */}
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-medium text-gray-500 w-[40%]"></span>
                  <div className="flex items-center gap-3 justify-end w-[60%]">
                    <span className="text-xs font-medium text-usa-500 w-10 text-center">USA</span>
                    <span className="text-xs font-medium text-europe-500 w-10 text-center">EUROPE</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    {(() => {
                      const { 
                        usaAdjustedFront9HolesWon, 
                        europeAdjustedFront9HolesWon, 
                        usaAdjustedBack9HolesWon, 
                        europeAdjustedBack9HolesWon,
                        usaAdjustedHolesWon,
                        europeAdjustedHolesWon,
                        usaFront9HolesWon,
                        europeFront9HolesWon,
                        usaBack9HolesWon,
                        europeBack9HolesWon,
                        usaHolesWon,
                        europeHolesWon
                      } = getHolesWon();
                      
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-400">Front 9:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-usa-400 w-10 text-center">
                                {usaAdjustedFront9HolesWon}
                                <span className="text-xs text-gray-500 ml-1">({usaFront9HolesWon})</span>
                              </span>
                              <span className="text-sm font-medium text-europe-400 w-10 text-center">
                                {europeAdjustedFront9HolesWon}
                                <span className="text-xs text-gray-500 ml-1">({europeFront9HolesWon})</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-400">Back 9:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-usa-400 w-10 text-center">
                                {usaAdjustedBack9HolesWon}
                                <span className="text-xs text-gray-500 ml-1">({usaBack9HolesWon})</span>
                              </span>
                              <span className="text-sm font-medium text-europe-400 w-10 text-center">
                                {europeAdjustedBack9HolesWon}
                                <span className="text-xs text-gray-500 ml-1">({europeBack9HolesWon})</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center sm:hidden border-b border-purple-800/30 pb-2">
                            <span className="text-sm font-medium text-gray-400">Total:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-usa-400 w-10 text-center">
                                {usaAdjustedHolesWon}
                                <span className="text-xs text-gray-500 ml-1">({usaHolesWon})</span>
                              </span>
                              <span className="text-sm font-medium text-europe-400 w-10 text-center">
                                {europeAdjustedHolesWon}
                                <span className="text-xs text-gray-500 ml-1">({europeHolesWon})</span>
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const { 
                        usaAdjustedHolesWon, 
                        europeAdjustedHolesWon,
                        usaHolesWon,
                        europeHolesWon 
                      } = getHolesWon();
                      const isUsaAhead = usaAdjustedHolesWon > europeAdjustedHolesWon;
                      const isEuropeAhead = europeAdjustedHolesWon > usaAdjustedHolesWon;
                      const holesDifference = Math.abs(usaAdjustedHolesWon - europeAdjustedHolesWon);
                      
                      return (
                        <>
                          <div className="hidden sm:flex justify-between items-center border-b border-purple-800/30 pb-2">
                            <span className="text-sm font-medium text-gray-400">Total:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-usa-400 w-10 text-center">
                                {usaAdjustedHolesWon}
                                <span className="text-xs text-gray-500 ml-1">({usaHolesWon})</span>
                              </span>
                              <span className="text-sm font-medium text-europe-400 w-10 text-center">
                                {europeAdjustedHolesWon}
                                <span className="text-xs text-gray-500 ml-1">({europeHolesWon})</span>
                              </span>
                            </div>
                          </div>
                                                    
                          {/* Explanation of how handicap affects match play */}
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              // Calculate the net impact of handicap on holes won
                              const usaNetHolesGained = usaAdjustedHolesWon - usaHolesWon;
                              const europeNetHolesGained = europeAdjustedHolesWon - europeHolesWon;
                              
                              const usaText = usaNetHolesGained > 0 
                                ? `USA +${usaNetHolesGained}` 
                                : usaNetHolesGained < 0 
                                  ? `USA ${usaNetHolesGained}` 
                                  : "USA +0";
                                  
                              const europeText = europeNetHolesGained > 0 
                                ? `Europe +${europeNetHolesGained}` 
                                : europeNetHolesGained < 0 
                                  ? `Europe ${europeNetHolesGained}` 
                                  : "Europe +0";
                                  
                              return `Holes from handicap: ${usaText} | ${europeText}`;
                            })()}
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-medium text-purple-300">Difference:</span>
                            <span className={`text-sm font-medium ${isEuropeAhead ? 'text-europe-400' : (isUsaAhead ? 'text-usa-400' : 'text-gray-500')}`}>
                              {isEuropeAhead && holesDifference > 0
                                ? `Europe ahead by ${holesDifference}` 
                                : (isUsaAhead && holesDifference > 0
                                  ? `USA ahead by ${holesDifference}` 
                                  : 'Tied')}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Match Play Holes Won (Unadjusted) - Only show when handicaps are OFF */}
          {scores.length > 0 && !useHandicaps && (
            <div className="mt-4 sm:mt-6 bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/50">
              <h4 className="text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Match play</h4>
              
              {/* Column headers */}
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-medium text-gray-500 w-[40%]"></span>
                <div className="flex items-center gap-3 justify-end w-[60%]">
                  <span className="text-xs font-medium text-usa-500 w-10 text-center">USA</span>
                  <span className="text-xs font-medium text-europe-500 w-10 text-center">EUROPE</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  {(() => {
                    const { 
                      usaFront9HolesWon, 
                      europeFront9HolesWon, 
                      usaBack9HolesWon, 
                      europeBack9HolesWon,
                      usaHolesWon,
                      europeHolesWon
                    } = getHolesWon();
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-400">Front 9:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">{usaFront9HolesWon}</span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">{europeFront9HolesWon}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-400">Back 9:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">{usaBack9HolesWon}</span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">{europeBack9HolesWon}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center sm:hidden border-b border-gray-700/50 pb-2">
                          <span className="text-sm font-medium text-gray-400">Total:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">{usaHolesWon}</span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">{europeHolesWon}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  {(() => {
                    const { usaHolesWon, europeHolesWon } = getHolesWon();
                    const isUsaAhead = usaHolesWon > europeHolesWon;
                    const isEuropeAhead = europeHolesWon > usaHolesWon;
                    const holesDifference = Math.abs(usaHolesWon - europeHolesWon);
                    
                    return (
                      <>
                        <div className="hidden sm:flex justify-between items-center border-b border-gray-700/50 pb-2">
                          <span className="text-sm font-medium text-gray-400">Total:</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-usa-400 w-10 text-center">{usaHolesWon}</span>
                            <span className="text-sm font-medium text-europe-400 w-10 text-center">{europeHolesWon}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-sm font-medium text-gray-300">Difference:</span>
                          <span className={`text-sm font-medium ${isEuropeAhead ? 'text-europe-400' : (isUsaAhead ? 'text-usa-400' : 'text-gray-500')}`}>
                            {isEuropeAhead && holesDifference > 0
                              ? `Europe ahead by ${holesDifference}` 
                              : (isUsaAhead && holesDifference > 0
                                ? `USA ahead by ${holesDifference}` 
                                : 'Tied')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-r from-gray-900/90 to-gray-950/90 dark:from-gray-950/90 dark:to-black/90 backdrop-blur-md px-6 py-3 sm:py-4 border-t border-gray-700/50 dark:border-gray-800/50">
          {error && (
            <div className="mb-2 sm:mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-red-300">
                  {error}
                </span>
              </div>
            </div>
          )}
          {distancesError && (
            <div className="text-sm text-red-400 mb-2">
              Error loading hole distances: {distancesError}
            </div>
          )}
          <div className="flex justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-gray-300 hover:text-white font-medium rounded-lg text-sm sm:text-base transition-colors duration-200"
              aria-label="Cancel score entry"
            >
              Cancel
            </button>
            <button
              onClick={handleScoreSubmit}
              disabled={isLoading}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-br from-europe-500 to-europe-600 text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
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