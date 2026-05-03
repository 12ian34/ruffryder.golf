import { auth } from '../config/firebase';
import type { User } from 'firebase/auth';
import posthog from 'posthog-js';

const posthogDebug = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

/**
 * Track a legacy Firebase event in PostHog with user information.
 */
export function track(eventName: string, properties: Record<string, any> = {}) {
  const currentUser = auth.currentUser;

  const userProperties = currentUser ? {
    distinct_id: currentUser.uid,
    user_id: currentUser.uid,
    email: currentUser.email,
    $email: currentUser.email,
    name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown User',
  } : {};

  if (posthogDebug) {
    // Intentionally removed console.log for tracking
  }

  posthog.capture(eventName, {
    ...properties,
    ...userProperties,
  });
}

/**
 * Identify a legacy Firebase user in PostHog.
 */
export function identifyUser(user: User | null) {
  if (user && user.email) {
    if (posthogDebug) {
      // Intentionally removed console.log for user identification
    }

    posthog.identify(user.email, {
      email: user.email,
      $email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
      firebase_uid: user.uid,
      user_id: user.uid,
      emailVerified: user.emailVerified,
    });

    posthog.people.set({
      email: user.email,
      $email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
      user_id: user.uid,
      emailVerified: user.emailVerified,
      last_login: new Date().toISOString()
    });

    posthog.register({
      user_email: user.email,
      $email: user.email,
      userId: user.uid,
      user_id: user.uid
    });

    posthog.capture('identified_user', {
      distinct_id: user.email,
      email: user.email,
      $email: user.email
    });

    posthog.capture('user_email_identified', {
      email: user.email,
      $email: user.email,
      distinct_id: user.email,
      user_id: user.uid
    });

    posthog.alias(user.email, user.uid);
  } else {
    if (posthogDebug) {
      // Intentionally removed console.log for reset identification
    }
    posthog.reset();
  }
}
