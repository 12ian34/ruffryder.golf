import { useState } from 'react';
import { Game, GameStatus, TournamentSettings } from '../types/game';
import GameCard from './GameCard';
import GameCompletionModal from './GameCompletionModal';
import StatusFilter from './filters/StatusFilter';

interface GameListProps {
  games: Game[];
  isAdmin: boolean;
  onGameStatusChange: (game: Game, newStatus: GameStatus) => Promise<void>;
  isOnline: boolean;
  useHandicaps: boolean;
  tournamentSettings?: TournamentSettings | null;
  showStatusFilter?: boolean;
  showControls?: boolean;
  linkedPlayerId: string | null;
}

export function GameList({ 
  games, 
  isAdmin, 
  onGameStatusChange, 
  isOnline, 
  useHandicaps, 
  tournamentSettings = null,
  showStatusFilter = true,
  showControls = true,
  linkedPlayerId
}: GameListProps) {
  const [gameToComplete, setGameToComplete] = useState<Game | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [activeStatus, setActiveStatus] = useState<GameStatus>('all');

  // Always use tournament settings' useHandicaps value if available
  const effectiveUseHandicaps = tournamentSettings?.useHandicaps ?? useHandicaps;

  const filteredGames = games
    .filter(game => {
      if (activeStatus === 'all') return true;
      if (activeStatus === 'not_started') return !game.isStarted;
      if (activeStatus === 'in_progress') return game.isStarted && !game.isComplete;
      return game.isComplete;
    })
    .sort((a, b) => {
      // Check if user is a player in either game
      const isUserInGameA = linkedPlayerId && (a.usaPlayerId === linkedPlayerId || a.europePlayerId === linkedPlayerId);
      const isUserInGameB = linkedPlayerId && (b.usaPlayerId === linkedPlayerId || b.europePlayerId === linkedPlayerId);
      
      // First priority: In-progress games the user is in
      if (a.isStarted && !a.isComplete && isUserInGameA && !(b.isStarted && !b.isComplete && isUserInGameB)) {
        return -1;
      }
      if (b.isStarted && !b.isComplete && isUserInGameB && !(a.isStarted && !a.isComplete && isUserInGameA)) {
        return 1;
      }
      
      // Second priority: All other in-progress and not-started games
      if (a.isComplete && !b.isComplete) return 1;
      if (!a.isComplete && b.isComplete) return -1;
      
      // If both games have the same priority, maintain original order
      return 0;
    });

  const handleGameStatusChange = async (game: Game, newStatus: GameStatus) => {
    try {
      if (newStatus === 'complete') {
        setGameToComplete(game);
      } else {
        await onGameStatusChange(game, newStatus);
        setModalKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating game status:', error);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {showStatusFilter && (
        <StatusFilter activeStatus={activeStatus} onStatusChange={setActiveStatus} />
      )}
      <div className="grid grid-cols-1 gap-4 w-full max-w-full">
        {filteredGames.map(game => {
          const isPlayerInGame = linkedPlayerId && 
            (game.usaPlayerId === linkedPlayerId || game.europePlayerId === linkedPlayerId);
          
          // Ensure showControls is always a boolean by explicitly checking against false
          const shouldShowControls = showControls !== false && (isAdmin || isPlayerInGame);
          
          return (
            <GameCard
              key={game.id}
              game={game}
              isAdmin={isAdmin}
              onStatusChange={(isAdmin || isPlayerInGame) ? handleGameStatusChange : undefined}
              onEnterScores={() => {}}
              showControls={!!shouldShowControls}
              useHandicaps={effectiveUseHandicaps}
              tournamentSettings={tournamentSettings}
              linkedPlayerId={linkedPlayerId}
            />
          );
        })}
        
        {filteredGames.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No games found
          </div>
        )}
      </div>
      {gameToComplete && (
        <GameCompletionModal
          key={modalKey}
          game={gameToComplete}
          tournamentId={gameToComplete.tournamentId}
          onClose={() => {
            setGameToComplete(null);
            setModalKey(prev => prev + 1);
          }}
          isOnline={isOnline}
          useHandicaps={effectiveUseHandicaps}
        />
      )}
    </div>
  );
}