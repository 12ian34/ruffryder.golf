import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import ScoreEntry from '../components/ScoreEntry';
import { getUserFourballMatchups } from '../services/matchupService';

export default function ScoreEntryPage() {
  const { gameId, tournamentId } = useParams<{ gameId: string; tournamentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useHandicaps, setUseHandicaps] = useState(false);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const handleBackNavigation = () => {
    // Pass the tab state back to the dashboard so it opens on the games tab
    const returnToTab = location.state?.returnToTab || 'games';
    navigate('/dashboard', { state: { activeTab: returnToTab } });
  };

  const scrollToFirstIncompleteHole = () => {
    // Use a longer timeout to ensure the DOM is fully rendered before trying to find and scroll
    setTimeout(() => {
      // Use requestAnimationFrame to ensure browser has completed a paint cycle
      requestAnimationFrame(() => {
        const holeRows = document.querySelectorAll('[data-hole-index]');
        
        if (holeRows.length === 0) {
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

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Separate effect for authorization check
    const checkAuthorization = async () => {
      if (!currentUser || !tournamentId || !gameId) {
        setIsAuthorized(false);
        setAuthCheckLoading(false);
        setError("Missing critical information for authorization.");
        return;
      }

      setAuthCheckLoading(true);
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError('User profile not found.');
          setIsAuthorized(false);
          setAuthCheckLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const isAdmin = userData.isAdmin || false;
        const linkedPlayerId = userData.linkedPlayerId || null;

        if (isAdmin) {
          setIsAuthorized(true);
        } else if (linkedPlayerId) {
          const fourballMatchups = await getUserFourballMatchups(tournamentId, linkedPlayerId);
          const canManageThisGame = fourballMatchups.some(matchup => matchup.id === gameId);
          setIsAuthorized(canManageThisGame);
          if (!canManageThisGame) {
            setError("You are not authorized to enter scores for this game.");
          }
        } else {
          setError("Unable to determine your player association for score entry.");
          setIsAuthorized(false);
        }
      } catch (authError: any) {
        console.error("Error during authorization check:", authError);
        setError(authError.message || 'Error checking authorization.');
        setIsAuthorized(false);
      } finally {
        setAuthCheckLoading(false);
      }
    };

    checkAuthorization();
  }, [currentUser, tournamentId, gameId, navigate]);
  
  // Effect for fetching game data, runs after initial currentUser check
  useEffect(() => {
    if (!currentUser) return; // Already handled by navigation in the auth check effect
    
    // Only fetch game if authorization check is complete and successful (or pending admin)
    // This can be simplified if checkAuthorization sets an error that stops game fetch
    
    // Let's keep fetchGame separate for now and rely on error/loading states
    // The authorization check will set its own error if needed.

    const fetchGameData = async () => {
      if (!gameId || !tournamentId) {
        setError('Game ID or Tournament ID not provided for game fetch.');
        setIsLoading(false); // For game data loading
        return;
      }
      setIsLoading(true); // For game data loading
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
        
        const effectiveUseHandicaps = gameData.useHandicaps !== undefined 
          ? gameData.useHandicaps 
          : tournamentData?.useHandicaps || false;
        
        setGame(gameData);
        setUseHandicaps(effectiveUseHandicaps);
        
      } catch (err: any) {
        // Preserve auth error if it exists, otherwise set game fetch error
        if (!error) setError(err.message || 'Failed to load game data');
      } finally {
        setIsLoading(false); // For game data loading
      }
    };
    
    // Fetch game data regardless of initial auth state, display errors appropriately
    fetchGameData();

  }, [currentUser, gameId, tournamentId, error, refetchTrigger]);

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

  if (isLoading || authCheckLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" data-testid="loading-spinner"></div>
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || "You are not authorized to enter scores for this game."}
          </p>
          <button
            onClick={handleBackNavigation}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Regular page mode for mobile/course use
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Enter scores
            </h1>
            <button
              onClick={handleBackNavigation}
              className="text-purple-500 hover:text-purple-600 dark:text-purple-400 font-medium"
            >
              ← Back
            </button>
          </div>
          <ScoreEntry
            gameId={gameId!}
            tournamentId={tournamentId!}
            onClose={handleBackNavigation}
            onSave={async () => {
              // Trigger a refetch of game data
              setRefetchTrigger(prev => prev + 1);
              // Scroll to first incomplete hole after saving (might need a slight delay or be part of game loaded effect)
              // For now, keep it simple. The scrollToFirstIncompleteHole is in a useEffect dependent on `game` and `isLoading`.
              // So it should trigger once the refetched game data is loaded.
            }}
            useHandicaps={useHandicaps}
          />
      </div>
    </div>
  );
} 