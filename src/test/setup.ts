import { beforeAll, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });
  
  global.document = dom.window.document;
  global.window = dom.window as unknown as Window & typeof globalThis;
  global.navigator = dom.window.navigator;
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Add other DOM properties
  global.HTMLElement.prototype.scrollIntoView = vi.fn();
  global.HTMLElement.prototype.hasPointerCapture = vi.fn();
  global.HTMLElement.prototype.releasePointerCapture = vi.fn();

  // Add missing DOM properties
  Object.defineProperty(window, 'CSS', { value: null });
  Object.defineProperty(document, 'doctype', {
    value: '<!DOCTYPE html>'
  });
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      display: 'none',
      appearance: ['-webkit-appearance'],
      getPropertyValue: () => ''
    })
  });

  // React Portal support
  Object.defineProperty(global, 'ResizeObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
}); 