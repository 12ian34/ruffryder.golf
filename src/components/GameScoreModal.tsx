import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import GameScoreTable from './shared/GameScoreTable';

interface GameScoreModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  useHandicaps: boolean;
}

export default function GameScoreModal({ game, isOpen, onClose, useHandicaps }: GameScoreModalProps) {
  const [tournamentUseHandicaps, setTournamentUseHandicaps] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    const fetchTournamentSettings = async () => {
      if (!game?.tournamentId) {
        return;
      }

      try {
        const tournamentRef = doc(db, 'tournaments', game.tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);
        if (tournamentDoc.exists()) {
          setTournamentUseHandicaps(tournamentDoc.data().useHandicaps);
          console.log("tournament handicaps:", tournamentUseHandicaps);
        }
      } catch (error) {
        console.error('Error fetching tournament settings:', error);
      }
    };

    fetchTournamentSettings();
  }, [game?.tournamentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Game Score</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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