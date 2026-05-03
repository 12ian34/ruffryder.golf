import { render, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const { legacyAppMock } = vi.hoisted(() => ({
  legacyAppMock: vi.fn(),
}));

vi.mock('../hooks/usePostHog', () => ({
  usePostHog: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  clearLocalStorage: vi.fn(),
}));

vi.mock('../pages/Tournament2026', () => ({
  default: () => <div>Supabase 2026 app</div>,
}));

vi.mock('../pages/LegacyApp', () => ({
  default: () => {
    legacyAppMock();
    return <div>Legacy Firebase app</div>;
  },
}));

describe('App routing cutover', () => {
  beforeEach(() => {
    legacyAppMock.mockClear();
  });

  it('renders the Supabase app at the root without loading the legacy app', () => {
    const view = renderAt('/');

    expect(view.getByText('Supabase 2026 app')).toBeInTheDocument();
    expect(legacyAppMock).not.toHaveBeenCalled();
  });

  it('keeps /2026 as a compatibility alias', () => {
    const view = renderAt('/2026');

    expect(view.getByText('Supabase 2026 app')).toBeInTheDocument();
    expect(legacyAppMock).not.toHaveBeenCalled();
  });

  it('redirects old legacy dashboard URLs into the legacy namespace', async () => {
    const view = renderAt('/dashboard');

    expect(await view.findByText('Legacy Firebase app')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/legacy/dashboard'));
  });

  it('redirects old legacy score-entry deep links into the legacy namespace', async () => {
    const view = renderAt('/score-entry/tournament-1/game-2');

    expect(await view.findByText('Legacy Firebase app')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/legacy/score-entry/tournament-1/game-2');
    });
  });

  it('preserves Firebase password-reset query strings during legacy redirects', async () => {
    const view = renderAt('/password-reset-complete?oobCode=reset-code&email=ian%40example.com');

    expect(await view.findByText('Legacy Firebase app')).toBeInTheDocument();
    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe(
        '/legacy/password-reset-complete?oobCode=reset-code&email=ian%40example.com'
      );
    });
  });
});

function renderAt(path: string) {
  window.history.pushState({}, '', path);

  const { container } = render(<App />);

  return within(container);
}
