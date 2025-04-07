import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import GameScoreDisplay from './shared/GameScoreDisplay';
import PlayerPair from './shared/PlayerPair';
import HandicapDisplay from './shared/HandicapDisplay';
import GameScoreModal from './GameScoreModal';

interface GameCardProps {
  game: Game;
  isAdmin?: boolean;
  onStatusChange?: (game: Game, status: 'not_started' | 'in_progress' | 'complete') => void;
  onEnterScores?: () => void;
  showControls?: boolean;
  compact?: boolean;
  useHandicaps?: boolean;
  tournamentSettings?: any;
  linkedPlayerId?: string | null;
}

export default function GameCard({ 
  game: initialGame, 
  isAdmin, 
  onStatusChange, 
  onEnterScores,
  showControls = false,
  compact = false,
  useHandicaps = false,
  tournamentSettings,
  linkedPlayerId = null
}: GameCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [handicapData, setHandicapData] = useState({
    usaPlayerHandicap: initialGame.usaPlayerHandicap || 0,
    europePlayerHandicap: initialGame.europePlayerHandicap || 0,
    handicapStrokes: initialGame.handicapStrokes || 0,
    higherHandicapTeam: initialGame.higherHandicapTeam || 'USA'
  });
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveUseHandicaps = tournamentSettings?.useHandicaps ?? useHandicaps;

  const isPlayerInGame = linkedPlayerId && (
    initialGame.usaPlayerId === linkedPlayerId || 
    initialGame.europePlayerId === linkedPlayerId
  );

  // Show special styling if user is admin or player in the game
  const showSpecialStyling = isAdmin || isPlayerInGame;

  const getBorderColor = () => {
    if (initialGame.isComplete) return 'border-success-500 dark:border-success-600';
    if (initialGame.isStarted) return 'border-europe-500 dark:border-europe-400';
    return 'border-gray-600 dark:border-gray-500';
  };

  // Fetch handicap data when game or tournament settings change
  useEffect(() => {
    const fetchHandicapData = async () => {
      if (!initialGame.usaPlayerId || !initialGame.europePlayerId) return;

      try {
        const [usaPlayerDoc, europePlayerDoc] = await Promise.all([
          getDoc(doc(db, 'players', initialGame.usaPlayerId)),
          getDoc(doc(db, 'players', initialGame.europePlayerId))
        ]);

        setHandicapData({
          usaPlayerHandicap: usaPlayerDoc.exists() ? usaPlayerDoc.data().averageScore : 0,
          europePlayerHandicap: europePlayerDoc.exists() ? europePlayerDoc.data().averageScore : 0,
          handicapStrokes: tournamentSettings?.handicapStrokes ?? 0,
          higherHandicapTeam: tournamentSettings?.higherHandicapTeam ?? 'USA'
        });
      } catch (error) {
        console.error('Error fetching player handicaps:', error);
      }
    };

    if (effectiveUseHandicaps) {
      fetchHandicapData();
    }
  }, [initialGame.usaPlayerId, initialGame.europePlayerId, tournamentSettings, effectiveUseHandicaps]);

  const handleStatusChange = useCallback(async (newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (onStatusChange) {
      await onStatusChange(initialGame, newStatus);
    }
  }, [initialGame, onStatusChange]);

  const handleStartGame = useCallback(() => {
    handleStatusChange('in_progress');
  }, [handleStatusChange]);

  const handleCloseModal = useCallback(() => {
    setShowScoreModal(false);
  }, []);

  const handleViewScores = useCallback(() => {
    setShowScoreModal(true);
  }, []);

  const handleEnterScores = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/score-entry/${initialGame.tournamentId}/${initialGame.id}`, {
      state: { from: location.pathname }
    });
  }, [navigate, initialGame.tournamentId, initialGame.id, location.pathname]);

  // Combine game data with handicap data
  const gameWithHandicaps = {
    ...initialGame,
    ...handicapData
  };

  return (
    <>
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow border-2 ${getBorderColor()} ${
          compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'
        } ${
          showSpecialStyling ? `ring-1 ${initialGame.isComplete ? 'ring-success-500 dark:ring-success-600' : 'ring-europe-500 dark:ring-europe-400'}` : ''
        } cursor-pointer hover:shadow-md transition-shadow duration-200`}
        onClick={(e) => {
          // Only open score modal if clicking on the card itself, not buttons
          if (!(e.target instanceof HTMLButtonElement)) {
            handleViewScores();
          }
        }}
      >
        <div className="space-y-4">
          <PlayerPair game={gameWithHandicaps} currentUserId={linkedPlayerId} compact={compact} />
          
          <GameScoreDisplay game={gameWithHandicaps} compact={compact} useHandicaps={effectiveUseHandicaps} />

          {showControls && (isAdmin || isPlayerInGame) && (
            <div className="space-y-2 md:max-w-xs mx-auto">
              {!initialGame.isStarted && onStatusChange && (
                <button
                  onClick={handleStartGame}
                  className="w-full px-4 py-2 bg-gradient-to-br from-europe-500 to-europe-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 text-sm font-medium"
                >
                  Start Game
                </button>
              )}
              
              {initialGame.isStarted && !initialGame.isComplete && onEnterScores && (
                <button
                  onClick={handleEnterScores}
                  className="w-full px-4 py-2 bg-gradient-to-br from-europe-500 to-europe-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 text-sm font-medium"
                >
                  Enter Scores
                </button>
              )}

              {onStatusChange && initialGame.isStarted && (
                <div className="space-y-2">
                  {initialGame.isComplete ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to mark this game as in progress? This will reset its completion status and remove its points from the tournament total.')) {
                            handleStatusChange('in_progress');
                          }
                        }}
                        className="w-full px-4 py-2 border border-europe-500 bg-europe-500/10 text-europe-700 dark:text-europe-300 rounded-lg hover:bg-europe-500/20 transition-colors duration-200 text-sm font-medium"
                      >
                        Mark as In Progress
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange('not_started');
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium"
                      >
                        Mark as Not Started
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange('complete');
                        }}
                        className="w-full px-4 py-2 border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/20 transition-colors duration-200 text-sm font-medium"
                      >
                        Mark as Complete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <HandicapDisplay game={gameWithHandicaps} compact={compact} useHandicaps={effectiveUseHandicaps} />
        </div>
      </div>

      <GameScoreModal
        game={gameWithHandicaps}
        isOpen={showScoreModal}
        onClose={handleCloseModal}
        useHandicaps={effectiveUseHandicaps}
      />
    </>
  );
}