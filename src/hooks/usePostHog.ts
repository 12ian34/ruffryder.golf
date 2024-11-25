import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    posthog: any;
  }
}

export function usePostHog() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      // Identify user in PostHog when they log in
      window.posthog.identify(currentUser.uid, {
        email: currentUser.email,
      });
    } else {
      // Reset identification when user logs out
      window.posthog.reset();
    }
  }, [currentUser]);

  return window.posthog;
}