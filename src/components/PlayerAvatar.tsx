import { useMemo } from 'react';
import { getDefaultAvatar } from '../utils/animalAvatars';

interface PlayerAvatarProps {
  playerId: string;
  name: string;
  customEmoji?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PlayerAvatar({ playerId, name, customEmoji, size = 'sm' }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg'
  };

  const defaultEmoji = useMemo(() => getDefaultAvatar(playerId), [playerId]);
  const displayEmoji = customEmoji || defaultEmoji;

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
      <span role="img" aria-label={name}>
        {displayEmoji}
      </span>
    </div>
  );
}