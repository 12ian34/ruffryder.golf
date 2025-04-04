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
}

export default function GameCard({ 
  game: initialGame, 
  isAdmin, 
  onStatusChange, 
  onEnterScores,
  showControls = false,
  compact = false,
  useHandicaps = false,
  tournamentSettings
}: GameCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [game, setGame] = useState(initialGame);
  const effectiveUseHandicaps = tournamentSettings?.useHandicaps ?? useHandicaps;

  // Get current user ID from auth context
  const currentUserId = isAdmin ? localStorage.getItem('userId') : null;
  const isAdminPlayer = currentUserId && (
    game.usaPlayerId === currentUserId || 
    game.europePlayerId === currentUserId
  );

  // Update game state when initialGame prop changes
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame]);

  // Fetch handicap data when game or tournament settings change
  useEffect(() => {
    const fetchHandicapData = async () => {
      if (!game.usaPlayerId || !game.europePlayerId) return;

      try {
        const [usaPlayerDoc, europePlayerDoc] = await Promise.all([
          getDoc(doc(db, 'players', game.usaPlayerId)),
          getDoc(doc(db, 'players', game.europePlayerId))
        ]);

        setGame(prevGame => ({
          ...prevGame,
          usaPlayerHandicap: usaPlayerDoc.exists() ? usaPlayerDoc.data().averageScore : 0,
          europePlayerHandicap: europePlayerDoc.exists() ? europePlayerDoc.data().averageScore : 0,
          handicapStrokes: tournamentSettings?.handicapStrokes ?? 0,
          higherHandicapTeam: tournamentSettings?.higherHandicapTeam ?? 'USA'
        }));
      } catch (error) {
        console.error('Error fetching player handicaps:', error);
      }
    };

    if (effectiveUseHandicaps) {
      fetchHandicapData();
    }
  }, [game.usaPlayerId, game.europePlayerId, tournamentSettings, effectiveUseHandicaps]);

  const handleShowScoreModal = () => {
    setShowScoreModal(true);
  };

  return (
    <>
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} ${
          isAdminPlayer ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
        } cursor-pointer hover:shadow-md transition-shadow duration-200`}
        onClick={handleShowScoreModal}
      >
        <div className="space-y-4">
          <PlayerPair game={game} currentUserId={currentUserId} compact={compact} />
          
          <GameScoreDisplay game={game} compact={compact} useHandicaps={effectiveUseHandicaps} />

          {showControls && (
            <div className="space-y-2">
              {!game.isStarted && onStatusChange && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(game, 'in_progress');
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Start Game
                </button>
              )}
              
              {game.isStarted && !game.isComplete && onEnterScores && (
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

              {onStatusChange && game.isStarted && (
                <div className="space-y-2">
                  {game.isComplete ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(game, 'in_progress');
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
                          onStatusChange(game, 'not_started');
                        }}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                      >
                        Mark as Not Started
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(game, 'complete');
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

          <HandicapDisplay game={game} compact={compact} useHandicaps={effectiveUseHandicaps} />
        </div>
      </div>

      <GameScoreModal
        game={game}
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        useHandicaps={effectiveUseHandicaps}
      />
    </>
  );
}