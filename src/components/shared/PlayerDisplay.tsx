import PlayerEmoji from '../PlayerEmoji';
import { Player } from '../../types/player';

interface PlayerDisplayProps {
  player: Player;
  team: 'USA' | 'EUROPE';
  showAverage?: boolean;
  compact?: boolean;
  isCurrentUser?: boolean;
  linkedUserName?: string;
}

export default function PlayerDisplay({ 
  player, 
  team, 
  showAverage = true, 
  compact = false,
  isCurrentUser = false,
  linkedUserName
}: PlayerDisplayProps) {
  const textColor = team === 'USA' ? 'text-usa-400 font-bold' : 'text-europe-400 font-bold';
  const badgeClasses = team === 'USA' 
    ? 'bg-usa-900/50 dark:bg-usa-900/50 text-usa-300 dark:text-usa-300 border border-usa-600/40' 
    : 'bg-europe-900/50 dark:bg-europe-900/50 text-europe-300 dark:text-europe-300 border border-europe-600/40';
  
  return (
    <div className={`text-center ${compact ? 'w-[120px] sm:w-[140px]' : 'w-[140px] sm:w-[180px]'}`}>
      <div className="flex flex-col items-center space-y-1">
        <PlayerEmoji
          playerId={player.id}
          name={player.name}
          customEmoji={player.customEmoji}
          size={compact ? 'sm' : 'md'}
        />
        <div className="min-w-0 w-full">
          <div className={`font-medium ${textColor} flex items-center justify-center flex-wrap gap-1`}>
            <span className="truncate">{player.name}</span>
            {isCurrentUser && (
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClasses}`}>
                You
              </span>
            )}
          </div>
          {linkedUserName && (
            <div className="text-xs text-gray-300 dark:text-gray-300 truncate mt-0.5">
              {linkedUserName}
            </div>
          )}
          {showAverage && (
            <div className="text-xs text-gray-300 dark:text-gray-300 mt-0.5">
              Handicap: {player.averageScore}
            </div>
          )}
          <div className="text-xs text-gray-300 dark:text-gray-300 mt-1">{team}</div>
        </div>
      </div>
    </div>
  );
}