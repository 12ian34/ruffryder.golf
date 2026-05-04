import type { User as SupabaseUser } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { identifySupabaseUser, track2026 } from '../utils/analytics';

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  peopleSet: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: posthogMock.capture,
    identify: posthogMock.identify,
    people: {
      set: posthogMock.peopleSet,
    },
    register: posthogMock.register,
    reset: posthogMock.reset,
  },
}));

describe('analytics utilities', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tracks 2026 events with the surface property', () => {
    track2026('score_saved', { hole_number: 10 });

    expect(posthogMock.capture).toHaveBeenCalledWith('score_saved', {
      surface: '2026',
      hole_number: 10,
    });
  });

  it('never lets analytics capture errors break app flows', () => {
    posthogMock.capture.mockImplementationOnce(() => {
      throw new Error('posthog unavailable');
    });

    expect(() => track2026('score_saved')).not.toThrow();
  });

  it('resets PostHog identity when the Supabase user is missing an email', () => {
    identifySupabaseUser(null);

    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });

  it('identifies Supabase users and registers profile super properties', () => {
    identifySupabaseUser(
      { id: 'user-1', email: 'ian@example.com' } as SupabaseUser,
      {
        id: 'profile-1',
        display_name: 'Ian',
        is_admin: true,
        linked_player_id: 'player-1',
        team: 'USA',
        custom_emoji: ':horse:',
      }
    );

    const expectedProfileProperties = {
      profile_id: 'profile-1',
      profile_display_name: 'Ian',
      profile_is_admin: true,
      linked_player_id: 'player-1',
      team: 'USA',
      has_custom_emoji: true,
    };

    expect(posthogMock.identify).toHaveBeenCalledWith('ian@example.com', {
      email: 'ian@example.com',
      $email: 'ian@example.com',
      supabase_uid: 'user-1',
      ...expectedProfileProperties,
    });
    expect(posthogMock.peopleSet).toHaveBeenCalledWith({
      email: 'ian@example.com',
      $email: 'ian@example.com',
      supabase_uid: 'user-1',
      ...expectedProfileProperties,
    });
    expect(posthogMock.register).toHaveBeenCalledWith({
      surface: '2026',
      user_email: 'ian@example.com',
      $email: 'ian@example.com',
      supabase_uid: 'user-1',
      ...expectedProfileProperties,
    });
  });
});
