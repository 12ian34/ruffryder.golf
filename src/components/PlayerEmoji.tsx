import { useMemo } from 'react';
import { getDefaultAvatar } from '../utils/animalAvatars';

interface PlayerEmojiProps {
  playerId: string;
  name: string;
  customEmoji?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PlayerEmoji({ playerId, name, customEmoji, size = 'sm' }: PlayerEmojiProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const defaultEmoji = useMemo(() => getDefaultAvatar(playerId), [playerId]);
  const displayEmoji = customEmoji || defaultEmoji;

  return (
    <span 
      role="img" 
      aria-label={name}
      className={sizeClasses[size]}
    >
      {displayEmoji}
    </span>
  );
}