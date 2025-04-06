import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHoleDistances, __resetCacheForTesting } from '../hooks/useHoleDistances';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  db: {},
}));

// Import mocked modules
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

describe('useHoleDistances hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Reset the cache before each test
    __resetCacheForTesting();
    
    // Setup doc mock
    (doc as any).mockReturnValue('mocked-hole-distances-doc-ref');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load hole distances from Firestore when no hook instance was previously rendered', async () => {
    const mockDistances = [100, 150, 200, 400, 130, 190, 340, 120, 450];
    
    // Mock successful Firestore response
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ indices: mockDistances }),
    });
    
    const { result } = renderHook(() => useHoleDistances());
    
    // Initial state should show loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Check the loaded data
    expect(result.current.distances).toEqual(mockDistances);
    expect(result.current.error).toBe(null);
    
    // Verify Firestore calls
    expect(doc).toHaveBeenCalledWith(db, 'config', 'holeDistances');
    expect(getDoc).toHaveBeenCalledWith('mocked-hole-distances-doc-ref');
  });
  
  it('should handle case when document does not exist', async () => {
    // Reset cache for this test
    __resetCacheForTesting();
    
    // Mock Firestore response for non-existent document
    (getDoc as any).mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });
    
    const { result } = renderHook(() => useHoleDistances());
    
    // Initial state should show loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the data loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should have empty distances array
    expect(result.current.distances).toEqual([]);
    expect(result.current.error).toBe(null);
    
    // Verify Firestore was called
    expect(doc).toHaveBeenCalledWith(db, 'config', 'holeDistances');
    expect(getDoc).toHaveBeenCalledWith('mocked-hole-distances-doc-ref');
  });
  
  it('should handle Firestore errors gracefully', async () => {
    // Reset cache for this test
    __resetCacheForTesting();
    
    const errorMessage = 'Network error';
    
    // Mock Firestore error
    (getDoc as any).mockRejectedValueOnce(new Error(errorMessage));
    
    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useHoleDistances());
    
    // Wait for error to be set
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should have error and empty distances
    expect(result.current.distances).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should handle empty indices array in the document', async () => {
    // Reset cache for this test
    __resetCacheForTesting();
    
    // Mock Firestore response with empty indices array
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ indices: [] }),
    });
    
    const { result } = renderHook(() => useHoleDistances());
    
    // Wait for the data loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should have empty distances array
    expect(result.current.distances).toEqual([]);
    expect(result.current.error).toBe(null);
  });
  
  it('should handle missing indices field in the document', async () => {
    // Reset cache for this test
    __resetCacheForTesting();
    
    // Mock Firestore response with no indices field
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ someOtherField: 'value' }),
    });
    
    const { result } = renderHook(() => useHoleDistances());
    
    // Wait for the data loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should default to empty array
    expect(result.current.distances).toEqual([]);
    expect(result.current.error).toBe(null);
  });
  
  it('should reuse cached data for subsequent hook instances', async () => {
    // Reset cache for this test
    __resetCacheForTesting();
    
    const mockDistances = [100, 150, 200];
    
    // Mock successful Firestore response for first call
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ indices: mockDistances }),
    });
    
    // First render should load from Firestore
    const { result: result1 } = renderHook(() => useHoleDistances());
    
    // Wait for first load to complete
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });
    
    expect(result1.current.distances).toEqual(mockDistances);
    expect(getDoc).toHaveBeenCalledTimes(1);
    
    // Second render - should use cache without calling Firestore again
    const { result: result2 } = renderHook(() => useHoleDistances());
    
    // Should immediately have data without loading state
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.distances).toEqual(mockDistances);
    
    // No additional Firestore calls
    expect(getDoc).toHaveBeenCalledTimes(1);
  });
}); 