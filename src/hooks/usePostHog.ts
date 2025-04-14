import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { useAuth } from '../contexts/AuthContext';
import { identifyUser } from '../utils/analytics';

// No longer needed as we're using the actual package
// declare global {
//   interface Window {
//     posthog: any;
//   }
// }

export function usePostHog() {
  const { currentUser } = useAuth();
  const previousUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Only proceed if user state has actually changed
    const currentUserId = currentUser?.uid || null;
    const previousUserId = previousUserRef.current;
    
    // Check if user state has changed
    if (currentUserId !== previousUserId) {
      console.log('Auth state changed, identifying user in PostHog');
      
      // Store current user ID for comparison in next render
      previousUserRef.current = currentUserId;
      
      // Identify the user in PostHog
      identifyUser(currentUser);
      
      // Log an authentication event if user is now logged in
      if (currentUser?.email && !previousUserId) {
        posthog.capture('user_authenticated', {
          email: currentUser.email,
          $email: currentUser.email,
          user_id: currentUser.uid,
          method: 'email'
        });
      }
    }
  }, [currentUser]);

  // Return the PostHog instance
  return posthog;
}