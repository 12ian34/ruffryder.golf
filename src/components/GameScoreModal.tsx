import { useEffect } from 'react';
import type { Game } from '../types/game';
import GameScoreTable from './shared/GameScoreTable';

interface GameScoreModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  useHandicaps: boolean;
}

export default function GameScoreModal({ game, isOpen, onClose, useHandicaps }: GameScoreModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape, { capture: true });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape, { capture: true });
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.posthog?.capture('game_score_modal_viewed', {
        gameId: game.id,
        playerNames: [game.usaPlayerName, game.europePlayerName]
      });
    }
  }, [isOpen, game.id]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-attr="game-score-modal-overlay"
    >
      <div className="bg-white dark:bg-black rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto" data-attr="game-score-modal-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Game score</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            data-attr="game-score-modal-close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <GameScoreTable game={game} useHandicaps={useHandicaps} />
      </div>
    </div>
  );
} 