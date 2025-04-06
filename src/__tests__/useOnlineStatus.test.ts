import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

describe('useOnlineStatus hook', () => {
  const originalNavigatorOnLine = navigator.onLine;
  
  // Mock navigator.onLine and window event listeners
  let onlineCallback: () => void;
  let offlineCallback: () => void;
  
  beforeEach(() => {
    // Mock addEventListener to capture callbacks
    window.addEventListener = vi.fn((event, callback) => {
      if (event === 'online') onlineCallback = callback as () => void;
      if (event === 'offline') offlineCallback = callback as () => void;
    });
    
    window.removeEventListener = vi.fn();
    
    // Reset navigator.onLine to the original value before each test
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
  });
  
  afterEach(() => {
    // Restore original navigator.onLine property
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalNavigatorOnLine
    });
    
    vi.restoreAllMocks();
  });
  
  it('should initialize with the current online status', () => {
    // Mock navigator.onLine to be online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    
    // Test with offline status
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });
    
    const { result: offlineResult } = renderHook(() => useOnlineStatus());
    expect(offlineResult.current).toBe(false);
  });
  
  it('should update status when online event is fired', () => {
    // Start as offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
    
    // Trigger online event using act
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    
    expect(result.current).toBe(true);
  });
  
  it('should update status when offline event is fired', () => {
    // Start as online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    
    // Trigger offline event using act
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    
    expect(result.current).toBe(false);
  });
  
  it('should set up and clean up event listeners', () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    
    unmount();
    
    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  // Add new edge case tests here
  it('should handle multiple status changes correctly', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true); // Initial state
    
    // Go offline
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current).toBe(false);
    
    // Go online
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    expect(result.current).toBe(true);
    
    // Go offline again
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current).toBe(false);
    
    // Go online again
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    expect(result.current).toBe(true);
  });
  
  it('should ignore redundant status events', () => {
    // Initialize with online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    
    // Fire online event when already online
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    expect(result.current).toBe(true);
    
    // Go offline
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current).toBe(false);
    
    // Fire offline event when already offline
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current).toBe(false);
  });
  
  it('should handle rapid status changes', () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    // Quickly toggle online/offline multiple times
    act(() => {
      if (offlineCallback) offlineCallback();
      if (onlineCallback) onlineCallback();
      if (offlineCallback) offlineCallback();
      if (onlineCallback) onlineCallback();
      if (offlineCallback) offlineCallback();
    });
    
    // Final state should be offline
    expect(result.current).toBe(false);
  });
  
  it('should preserve online status across rerenders', () => {
    // Start online
    const { result, rerender } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    
    // Go offline
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current).toBe(false);
    
    // Rerender should preserve the offline status
    rerender();
    expect(result.current).toBe(false);
    
    // Go back online
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    expect(result.current).toBe(true);
    
    // Rerender should preserve the online status
    rerender();
    expect(result.current).toBe(true);
  });
}); 