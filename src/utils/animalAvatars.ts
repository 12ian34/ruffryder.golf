// List of animal emojis for default avatars
export const animalEmojis = [
  '🦊', '🦁', '🐯', '🐮', '🦒', '🦘', '🦬', '🦙', 
  '🦥', '🦨', '🦡', '🦦', '🦇', '🦔', '🐻', '🐨',
  '🐼', '🦃', '🦚', '🦜', '🦢', '🦩', '🐸', '🐢'
];

export function getAnimalAvatar(playerId: string): string {
  // Use player ID to consistently get same animal for each player
  const index = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % animalEmojis.length;
  return animalEmojis[index];
}