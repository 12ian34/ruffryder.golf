import type { User as SupabaseUser } from '@supabase/supabase-js';
import posthog from 'posthog-js';

// Log the environment variables to help debug PostHog initialization
const posthogProjectToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogDebug = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

interface SupabaseProfileProperties {
  id: string;
  display_name: string;
  is_admin: boolean;
  linked_player_id: string | null;
  team: 'USA' | 'EUROPE' | null;
  custom_emoji?: string | null;
}

// Log configuration in development mode
if (posthogDebug) {
  if (!posthogProjectToken) {
    console.warn('PostHog project token is missing! Add VITE_PUBLIC_POSTHOG_PROJECT_TOKEN to your environment variables');
  }
}

export function track2026(eventName: string, properties: Record<string, unknown> = {}) {
  try {
    posthog.capture(eventName, {
      surface: '2026',
      ...properties,
    });
  } catch {
    // Analytics must never block tournament-day workflows.
  }
}

export function identifySupabaseUser(
  user: SupabaseUser | null,
  profile?: SupabaseProfileProperties | null
) {
  try {
    if (!user?.email) {
      posthog.reset();
      return;
    }

    const profileProperties = profile ? {
      profile_id: profile.id,
      profile_display_name: profile.display_name,
      profile_is_admin: profile.is_admin,
      linked_player_id: profile.linked_player_id,
      team: profile.team,
      has_custom_emoji: Boolean(profile.custom_emoji),
    } : {};

    posthog.identify(user.email, {
      email: user.email,
      $email: user.email,
      supabase_uid: user.id,
      ...profileProperties,
    });
    posthog.people.set({
      email: user.email,
      $email: user.email,
      supabase_uid: user.id,
      ...profileProperties,
    });
    posthog.register({
      surface: '2026',
      user_email: user.email,
      $email: user.email,
      supabase_uid: user.id,
      ...profileProperties,
    });
  } catch {
    // Analytics must never block auth state changes.
  }
}