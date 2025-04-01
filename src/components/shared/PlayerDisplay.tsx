import PlayerEmoji from '../PlayerEmoji';
import { Player } from '../../types/player';

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
  const textColor = team === 'USA' ? 'text-usa-500' : 'text-europe-500';
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center space-x-2">
        <PlayerEmoji
          playerId={player.id}
          name={player.name}
          customEmoji={player.customEmoji}
          size={compact ? 'sm' : 'md'}
        />
        <div>
          <div className={`font-medium ${textColor} flex items-center space-x-1`}>
            <span>{player.name}</span>
            {isCurrentUser && (
              <span className="ml-1 text-xs bg-europe-100 dark:bg-europe-800 text-europe-800 dark:text-europe-200 px-2 py-0.5 rounded-full">
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