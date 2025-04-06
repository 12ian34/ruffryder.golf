/**
 * Utilities for managing localStorage
 */

/**
 * Clear all application-specific localStorage items
 * Preserves theme preference which should persist across sessions
 * @param includeLastVisitedPage - Whether to clear lastVisitedPage (defaults to true)
 */
export const clearLocalStorage = (includeLastVisitedPage = true) => {
  try {
    // Explicitly remove known app keys
    localStorage.removeItem('ruffryder_games');
    localStorage.removeItem('userId');
    
    // Remove lastVisitedPage if specified (for testing compatibility)
    if (includeLastVisitedPage) {
      localStorage.removeItem('lastVisitedPage');
    }
    
    // Also clear any other keys that start with ruffryder_ but aren't the theme
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('ruffryder_') && key !== 'ruffryder_theme' && 
          key !== 'ruffryder_games') { // Skip this since we already removed it
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

/**
 * Get a value from localStorage with proper error handling
 */
export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting localStorage item "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Set a value in localStorage with proper error handling
 */
export const setLocalStorageItem = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
    return false;
  }
}; 