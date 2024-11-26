import { useMemo } from 'react';
import { getAnimalAvatar } from '../utils/animalAvatars';

interface PlayerAvatarProps {
  playerId: string;
  profilePicUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PlayerAvatar({ playerId, profilePicUrl, name, size = 'sm' }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg'
  };

  const animalEmoji = useMemo(() => getAnimalAvatar(playerId), [playerId]);

  if (profilePicUrl) {
    return (
      <img
        src={profilePicUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
      <span role="img" aria-label={name}>
        {animalEmoji}
      </span>
    </div>
  );
}