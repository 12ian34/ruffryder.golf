import { auth } from '../config/firebase';
import type { User } from 'firebase/auth';
import posthog from 'posthog-js';

// Log the environment variables to help debug PostHog initialization
const posthogApiKey = import.meta.env.VITE_POSTHOG_API_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;
const posthogDebug = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

// Log configuration in development mode
if (posthogDebug) {
  if (!posthogApiKey) {
    console.warn('PostHog API key is missing! Add VITE_POSTHOG_API_KEY to your Netlify environment variables');
  }
}

/**
 * Track an event in PostHog with user information
 * 
 * This helper ensures that every event includes relevant user information
 * which makes it easier to identify users in PostHog analytics
 * 
 * @param eventName The name of the event to track
 * @param properties Additional properties to include with the event
 */
export function track(eventName: string, properties: Record<string, any> = {}) {
  const currentUser = auth.currentUser;
  
  // Always include user information in the event properties
  const userProperties = currentUser ? {
    distinct_id: currentUser.uid,
    user_id: currentUser.uid,
    email: currentUser.email,
    $email: currentUser.email, // PostHog special property
    name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown User',
  } : {};

  // Log tracking in debug mode
  if (posthogDebug) {
    // Intentionally removed console.log for tracking
  }

  // Capture the event with combined properties
  posthog.capture(eventName, {
    ...properties,
    ...userProperties,
  });
}

/**
 * Identify a user in PostHog
 * 
 * This helper ensures consistent user identification across the application
 * and makes user email addresses visible in PostHog records
 * 
 * @param user The Firebase user object to identify
 */
export function identifyUser(user: User | null) {
  if (user && user.email) {
    // Log identification in debug mode
    if (posthogDebug) {
      // Intentionally removed console.log for user identification
    }

    // Force the distinct_id to be the email to make it more visible in PostHog
    posthog.identify(user.email, {
      email: user.email,
      $email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
      firebase_uid: user.uid,
      user_id: user.uid,
      emailVerified: user.emailVerified,
    });
    
    // Set person properties that will be visible in the UI
    posthog.people.set({
      email: user.email,
      $email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
      user_id: user.uid,
      emailVerified: user.emailVerified,
      last_login: new Date().toISOString()
    });

    // Set super properties that persist across all events/pageviews
    posthog.register({
      user_email: user.email,
      $email: user.email,
      userId: user.uid,
      user_id: user.uid
    });

    // Send a direct event with email as the primary ID to force visibility
    posthog.capture('identified_user', {
      distinct_id: user.email,
      email: user.email,
      $email: user.email
    });
    
    // Log a dedicated event that's easier to search for in PostHog
    posthog.capture('user_email_identified', {
      email: user.email,
      $email: user.email,
      distinct_id: user.email,
      user_id: user.uid
    });

    // Also try explicit email alias to ensure it's linked
    posthog.alias(user.email, user.uid);
  } else {
    // Reset identification when user is null
    if (posthogDebug) {
      // Intentionally removed console.log for reset identification
    }
    posthog.reset();
  }
} 