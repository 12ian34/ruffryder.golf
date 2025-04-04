export const clearLocalStorage = () => {
  try {
    // Clear all RuffRyder-specific localStorage items
    localStorage.removeItem('ruffryder_games');
    localStorage.removeItem('userId');
    // Don't clear theme as it's a user preference that should persist
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}; 