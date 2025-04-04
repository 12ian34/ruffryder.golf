import { User } from 'firebase/auth';
import { useGameData } from '../hooks/useGameData';
import { useActiveTournament } from '../hooks/useActiveTournament';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { GameList } from './GameList';

interface GameManagementProps {
  currentUser: User;
  isAdmin: boolean;
  linkedPlayerId: string | null;
}

export function GameManagement({ currentUser, isAdmin, linkedPlayerId }: GameManagementProps) {
  const isOnline = useOnlineStatus();
  const { activeTournament, isLoading: isLoadingTournament } = useActiveTournament(currentUser?.uid);
  const { games, handleGameStatusChange, tournamentSettings, isLoading: isLoadingGames } = useGameData(
    activeTournament?.id,
    linkedPlayerId,
    isAdmin
  );

  if (!currentUser) {
    return <div>Please sign in to view games.</div>;
  }

  if (isLoadingTournament || isLoadingGames) {
    return <div>Loading games...</div>;
  }

  if (!isAdmin && !linkedPlayerId) {
    return <div>Please link your player profile to view games.</div>;
  }

  if (!activeTournament) {
    return <div>No active tournament found.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Games</h2>
      <GameList
        games={games}
        onGameStatusChange={handleGameStatusChange}
        isAdmin={isAdmin}
        isOnline={isOnline}
        useHandicaps={tournamentSettings?.useHandicaps ?? false}
        tournamentSettings={tournamentSettings}
      />
    </div>
  );
}