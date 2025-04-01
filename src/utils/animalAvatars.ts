// List of available emojis for avatars (no duplicates)
export const availableEmojis = [
  '🦊', '🦁', '🐯', '🐮', '🦒', '🦘', '🦬', '🦙', 
  '🦥', '🦨', '🦡', '🦦', '🦇', '🦔', '🐻', '🐨',
  '🐼', '🦃', '🦚', '🦜', '🦢', '🦩', '🐸', '🐢',
  '🐱', '🐶', '🐭', '🐹', '🐰', '🐵', '🐔', '🦆',
  '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🦏', '🦛',
  '🦍', '🦧', '🐘', '🦌', '🐪', '🐫', '🍆'
];

export function getDefaultAvatar(playerId: string): string {
  // Use player ID to consistently get same emoji for each player
  const index = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % availableEmojis.length;
  return availableEmojis[index];
}