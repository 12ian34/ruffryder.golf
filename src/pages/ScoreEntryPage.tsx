import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import ScoreEntry from '../components/ScoreEntry';

export default function ScoreEntryPage() {
  const { gameId, tournamentId } = useParams<{ gameId: string; tournamentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useHandicaps, setUseHandicaps] = useState(false);

  // Get the previous location from state or default to the current path
  const previousLocation = location.state?.from || `/score-entry/${tournamentId}/${gameId}`;

  const scrollToFirstIncompleteHole = () => {
    // Use a longer timeout to ensure the DOM is fully rendered before trying to find and scroll
    setTimeout(() => {
      // Use requestAnimationFrame to ensure browser has completed a paint cycle
      requestAnimationFrame(() => {
        const holeRows = document.querySelectorAll('[data-hole-index]');
        
        if (holeRows.length === 0) {
          console.log('No hole rows found, trying again...');
          // Try again after a short delay if hole rows aren't found
          setTimeout(scrollToFirstIncompleteHole, 100);
          return;
        }
        
        for (let i = 0; i < holeRows.length; i++) {
          const holeIndex = parseInt(holeRows[i].getAttribute('data-hole-index') || '0');
          // Find both inputs for this hole
          const usaInput = document.querySelector(`input[tabindex="${holeIndex * 2 + 1}"]`) as HTMLInputElement;
          const europeInput = document.querySelector(`input[tabindex="${holeIndex * 2 + 2}"]`) as HTMLInputElement;
          
          // Check if either input is empty
          if (usaInput && !usaInput.value || europeInput && !europeInput.value) {
            // Find the scrollable container
            const scrollContainer = document.querySelector('.overflow-y-auto');
            if (scrollContainer) {
              // Get the container's position
              const containerRect = scrollContainer.getBoundingClientRect();
              // Get the hole row's position
              const rowRect = holeRows[i].getBoundingClientRect();
              const relativeTop = rowRect.top - containerRect.top;
              
              // Scroll the container
              scrollContainer.scrollTo({
                top: scrollContainer.scrollTop + relativeTop - containerRect.height / 3,
                behavior: 'smooth'
              });
              
              // Focus the first empty input
              if (usaInput && !usaInput.value) {
                usaInput.focus();
              } else if (europeInput && !europeInput.value) {
                europeInput.focus();
              }
              
              break;
            }
          }
        }
      });
    }, 300); // Increased timeout to ensure modal is fully rendered
  };

  const fetchGame = async () => {
    if (!gameId || !tournamentId) {
      setError('Game ID or Tournament ID not provided');
      setIsLoading(false);
      return;
    }

    try {
      // Get both game and tournament settings
      const [gameDoc, tournamentDoc] = await Promise.all([
        getDoc(doc(db, 'tournaments', tournamentId, 'games', gameId)),
        getDoc(doc(db, 'tournaments', tournamentId))
      ]);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as Game;
      const tournamentData = tournamentDoc.data();
      
      // Use tournament settings if game settings are not explicitly set
      const effectiveUseHandicaps = gameData.useHandicaps !== undefined 
        ? gameData.useHandicaps 
        : tournamentData?.useHandicaps || false;
      
      setGame(gameData);
      setUseHandicaps(effectiveUseHandicaps);
      
      // We'll handle scrolling in useEffect after the state update has completed
    } catch (err: any) {
      setError(err.message || 'Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchGame();
  }, [currentUser, gameId, tournamentId, navigate]);
  
  // New effect to scroll to first incomplete hole after game is loaded
  useEffect(() => {
    if (game && !isLoading) {
      // Wait for the DOM to update after the game state is set
      const timer = setTimeout(() => {
        scrollToFirstIncompleteHole();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [game, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Game not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Enter Scores
            </h1>
            <button
              onClick={() => navigate(previousLocation)}
              className="text-purple-500 hover:text-purple-600 dark:text-purple-400"
            >
              Back
            </button>
          </div>
          <ScoreEntry
            gameId={gameId!}
            tournamentId={tournamentId!}
            onClose={() => navigate(previousLocation)}
            onSave={async () => {
              // Refresh the game data
              setIsLoading(true);
              await fetchGame();
              setIsLoading(false);
              // Scroll to first incomplete hole after saving
              scrollToFirstIncompleteHole();
            }}
            useHandicaps={useHandicaps}
          />
        </div>
      </div>
    </div>
  );
} 