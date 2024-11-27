import PlayerAvatar from '../PlayerAvatar';
import type { Player } from '../../types/player';

interface PlayerDisplayProps {
  player: Player;
  team: 'USA' | 'EUROPE';
  showAverage?: boolean;
  compact?: boolean;
}

export default function PlayerDisplay({ player, team, showAverage = true, compact = false }: PlayerDisplayProps) {
  const textColor = team === 'USA' ? 'text-red-500' : 'text-blue-500';
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center space-x-2">
        <PlayerAvatar
          playerId={player.id}
          name={player.name}
          size={compact ? 'sm' : 'md'}
        />
        <div className={`font-medium ${textColor}`}>
          {player.name}
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