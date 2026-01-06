import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';

// Mock Firebase auth
const mockCurrentUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
};

vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

// Mock PostHog
const mockPostHog = {
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  people: {
    set: vi.fn(),
  },
  register: vi.fn(),
  alias: vi.fn(),
};

vi.mock('posthog-js', () => ({
  default: mockPostHog,
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_POSTHOG_API_KEY: 'test-api-key',
      VITE_POSTHOG_DEBUG: 'false',
    },
  },
});

describe('analytics utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the auth mock
    vi.doMock('../config/firebase', () => ({
      auth: {
        currentUser: null,
      },
    }));
  });

  describe('track', () => {
    it('should capture events without user info when not logged in', async () => {
      // Re-import to get fresh module with mocked auth
      vi.doMock('../config/firebase', () => ({
        auth: {
          currentUser: null,
        },
      }));
      
      const { track } = await import('../utils/analytics');
      
      track('test_event', { property1: 'value1' });

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'test_event',
        expect.objectContaining({
          property1: 'value1',
        })
      );
    });

    it('should include user info in events when logged in', async () => {
      vi.doMock('../config/firebase', () => ({
        auth: {
          currentUser: mockCurrentUser,
        },
      }));
      
      // Force re-import
      vi.resetModules();
      const { track } = await import('../utils/analytics');
      
      track('test_event', { custom: 'data' });

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'test_event',
        expect.objectContaining({
          custom: 'data',
          distinct_id: mockCurrentUser.uid,
          user_id: mockCurrentUser.uid,
          email: mockCurrentUser.email,
          $email: mockCurrentUser.email,
        })
      );
    });

    it('should handle events with no additional properties', async () => {
      vi.doMock('../config/firebase', () => ({
        auth: {
          currentUser: null,
        },
      }));
      
      vi.resetModules();
      const { track } = await import('../utils/analytics');
      
      track('simple_event');

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'simple_event',
        expect.any(Object)
      );
    });

    it('should derive name from email when displayName is not set', async () => {
      vi.doMock('../config/firebase', () => ({
        auth: {
          currentUser: {
            ...mockCurrentUser,
            displayName: null,
          },
        },
      }));
      
      vi.resetModules();
      const { track } = await import('../utils/analytics');
      
      track('test_event');

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'test_event',
        expect.objectContaining({
          name: 'test', // derived from test@example.com
        })
      );
    });
  });

  describe('identifyUser', () => {
    it('should identify user with email and properties', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'user-456',
        email: 'identified@example.com',
        displayName: 'Identified User',
        emailVerified: true,
      } as User;

      identifyUser(user);

      expect(mockPostHog.identify).toHaveBeenCalledWith(
        'identified@example.com',
        expect.objectContaining({
          email: 'identified@example.com',
          $email: 'identified@example.com',
          name: 'Identified User',
          firebase_uid: 'user-456',
          user_id: 'user-456',
          emailVerified: true,
        })
      );
    });

    it('should set person properties', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'user-789',
        email: 'person@example.com',
        displayName: 'Person Name',
        emailVerified: false,
      } as User;

      identifyUser(user);

      expect(mockPostHog.people.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'person@example.com',
          $email: 'person@example.com',
          name: 'Person Name',
          user_id: 'user-789',
          emailVerified: false,
        })
      );
    });

    it('should register super properties', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'super-user',
        email: 'super@example.com',
        displayName: 'Super User',
        emailVerified: true,
      } as User;

      identifyUser(user);

      expect(mockPostHog.register).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'super@example.com',
          $email: 'super@example.com',
          userId: 'super-user',
          user_id: 'super-user',
        })
      );
    });

    it('should capture identification events', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'event-user',
        email: 'event@example.com',
        displayName: 'Event User',
        emailVerified: true,
      } as User;

      identifyUser(user);

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'identified_user',
        expect.objectContaining({
          distinct_id: 'event@example.com',
          email: 'event@example.com',
        })
      );

      expect(mockPostHog.capture).toHaveBeenCalledWith(
        'user_email_identified',
        expect.objectContaining({
          email: 'event@example.com',
          user_id: 'event-user',
        })
      );
    });

    it('should create alias for email to uid', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'alias-user',
        email: 'alias@example.com',
        displayName: 'Alias User',
        emailVerified: true,
      } as User;

      identifyUser(user);

      expect(mockPostHog.alias).toHaveBeenCalledWith(
        'alias@example.com',
        'alias-user'
      );
    });

    it('should reset PostHog when user is null', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      identifyUser(null);

      expect(mockPostHog.reset).toHaveBeenCalled();
      expect(mockPostHog.identify).not.toHaveBeenCalled();
    });

    it('should reset PostHog when user has no email', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const userWithoutEmail = {
        uid: 'no-email-user',
        email: null,
        displayName: 'No Email',
        emailVerified: false,
      } as unknown as User;

      identifyUser(userWithoutEmail);

      expect(mockPostHog.reset).toHaveBeenCalled();
      expect(mockPostHog.identify).not.toHaveBeenCalled();
    });

    it('should derive name from email when displayName is missing', async () => {
      vi.resetModules();
      const { identifyUser } = await import('../utils/analytics');
      
      const user = {
        uid: 'no-name-user',
        email: 'noname@example.com',
        displayName: null,
        emailVerified: true,
      } as User;

      identifyUser(user);

      expect(mockPostHog.identify).toHaveBeenCalledWith(
        'noname@example.com',
        expect.objectContaining({
          name: 'noname', // derived from email
        })
      );
    });
  });
});

