import { useState, useEffect } from 'react';
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
  const effectiveUseHandicaps = tournamentSettings?.useHandicaps ?? useHandicaps;

  const isPlayerInGame = linkedPlayerId && (
    initialGame.usaPlayerId === linkedPlayerId || 
    initialGame.europePlayerId === linkedPlayerId
  );

  // Show special styling if user is admin or player in the game
  const showSpecialStyling = isAdmin || isPlayerInGame;

  const getBorderColor = () => {
    if (initialGame.isComplete) return 'border-green-500 dark:border-green-400';
    if (initialGame.isStarted) return 'border-amber-500 dark:border-amber-400';
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

  const handleShowScoreModal = () => {
    setShowScoreModal(true);
  };

  const handleStartGame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange) {
      await onStatusChange(initialGame, 'in_progress');
    }
  };

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
          showSpecialStyling ? 'ring-1 ring-blue-500 dark:ring-blue-400' : ''
        } cursor-pointer hover:shadow-md transition-shadow duration-200`}
        onClick={handleShowScoreModal}
      >
        <div className="space-y-4">
          <PlayerPair game={gameWithHandicaps} currentUserId={linkedPlayerId} compact={compact} />
          
          <GameScoreDisplay game={gameWithHandicaps} compact={compact} useHandicaps={effectiveUseHandicaps} />

          {showControls && (isAdmin || isPlayerInGame) && (
            <div className="space-y-2 md:max-w-xs mx-auto">
              {!initialGame.isStarted && onStatusChange && (
                <button
                  onClick={handleStartGame}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Start Game
                </button>
              )}
              
              {initialGame.isStarted && !initialGame.isComplete && onEnterScores && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterScores();
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Enter Scores
                </button>
              )}

              {onStatusChange && initialGame.isStarted && (
                <div className="space-y-2">
                  {initialGame.isComplete ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(initialGame, 'in_progress');
                      }}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                    >
                      Mark as In Progress
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(initialGame, 'not_started');
                        }}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                      >
                        Mark as Not Started
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(initialGame, 'complete');
                        }}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
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
        onClose={() => setShowScoreModal(false)}
        useHandicaps={effectiveUseHandicaps}
      />
    </>
  );
}