import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

// Mock modules first (these are hoisted by vitest)
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(() => vi.fn()),
  },
  db: {},
}));

// Import the mocked modules
import { getDoc, doc } from 'firebase/firestore';
import { auth } from '../config/firebase';

// Use any type for mocked firebase user to avoid complex type issues
type MockFirebaseUser = {
  uid: string;
  email: string | null;
  [key: string]: any;
};

describe('useAuth hook', () => {
  // Setup mocks after the vi.mock calls
  const mockUnsubscribe = vi.fn();
  let authCallback: (user: MockFirebaseUser | null) => void;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Setup auth mock
    (auth.onAuthStateChanged as any).mockImplementation((cb: (user: MockFirebaseUser | null) => void) => {
      authCallback = cb;
      return mockUnsubscribe;
    });
    
    // Setup doc mock
    (doc as any).mockReturnValue('mocked-doc-ref');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state and null user', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('should set user to null when not authenticated', async () => {
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      authCallback(null);
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  it('should set user data when authenticated and user document exists', async () => {
    const mockFirebaseUser: MockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
    };
    
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'Test User' }),
    });
    
    const { result } = renderHook(() => useAuth());
    
    authCallback(mockFirebaseUser);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        name: 'Test User',
      });
    });
  });

  it('should handle case when user document does not exist', async () => {
    const mockFirebaseUser: MockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
    };
    
    (getDoc as any).mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });
    
    const { result } = renderHook(() => useAuth());
    
    authCallback(mockFirebaseUser);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        name: null,
      });
    });
  });

  it('should handle error when fetching user data', async () => {
    const mockFirebaseUser: MockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
    };
    
    (getDoc as any).mockRejectedValueOnce(new Error('Firestore error'));
    
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    const { result } = renderHook(() => useAuth());
    
    authCallback(mockFirebaseUser);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        name: null,
      });
      expect(console.error).toHaveBeenCalled();
    });
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAuth());
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
}); 