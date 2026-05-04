import { render, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const { clearLocalStorageMock } = vi.hoisted(() => ({
  clearLocalStorageMock: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  clearLocalStorage: clearLocalStorageMock,
}));

vi.mock('../pages/Tournament2026', () => ({
  default: () => <div>Supabase 2026 app</div>,
}));

describe('App routing cutover', () => {
  beforeEach(() => {
    clearLocalStorageMock.mockClear();
  });

  it('renders the Supabase app at the root', () => {
    const view = renderAt('/');

    expect(view.getByText('Supabase 2026 app')).toBeInTheDocument();
    expect(clearLocalStorageMock).toHaveBeenCalledOnce();
  });

  it('keeps /2026 as a compatibility alias', () => {
    const view = renderAt('/2026');

    expect(view.getByText('Supabase 2026 app')).toBeInTheDocument();
  });

  it('redirects old app URLs to the Supabase app', async () => {
    const legacyPaths = [
      '/login',
      '/dashboard',
      '/profile',
      '/about',
      '/password-reset-complete?oobCode=reset-code',
      '/score-entry/tournament-1/game-2',
      '/legacy/dashboard',
    ];

    for (const path of legacyPaths) {
      const view = renderAt(path);

      expect(view.getByText('Supabase 2026 app')).toBeInTheDocument();
      await waitFor(() => expect(window.location.pathname).toBe('/'));
    }
  });
});

function renderAt(path: string) {
  window.history.pushState({}, '', path);

  const { container } = render(<App />);

  return within(container);
}
