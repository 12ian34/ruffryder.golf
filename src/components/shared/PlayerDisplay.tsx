import PlayerAvatar from '../PlayerAvatar';
import type { Player } from '../../types/player';

interface PlayerDisplayProps {
  player: Player;
  team: 'USA' | 'EUROPE';
  showAverage?: boolean;
  compact?: boolean;
  isCurrentUser?: boolean;
}

export default function PlayerDisplay({ 
  player, 
  team, 
  showAverage = true, 
  compact = false,
  isCurrentUser = false
}: PlayerDisplayProps) {
  const textColor = team === 'USA' ? 'text-red-500' : 'text-blue-500';
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center space-x-2">
        <PlayerAvatar
          playerId={player.id}
          name={player.name}
          size={compact ? 'sm' : 'md'}
        />
        <div>
          <div className={`font-medium ${textColor} flex items-center space-x-1`}>
            <span>{player.name}</span>
            {isCurrentUser && (
              <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          {showAverage && (
            <div className="text-sm text-gray-500">
              Avg: {player.averageScore}
            </div>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-500">{team}</div>
    </div>
  );
}