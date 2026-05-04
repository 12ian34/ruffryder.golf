import { fireEvent, render, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { PageShell, type AppNavItem } from '../features/tournament2026/components/Layout';
import { track2026 } from '../utils/analytics';

vi.mock('../utils/analytics', () => ({
  track2026: vi.fn(),
}));

describe('PageShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    vi.clearAllMocks();
  });

  it('renders app navigation and handles tab changes', () => {
    const onTabChange = vi.fn();

    const { container } = renderWithTheme(
      <PageShell
        activeTab="score"
        navItems={navItems}
        onTabChange={onTabChange}
        userEmail="ian@example.com"
        onSignOut={vi.fn()}
      >
        <div>Active panel</div>
      </PageShell>
    );
    const view = within(container);

    expect(view.getByText('Active panel')).toBeInTheDocument();
    expect(view.getAllByText('my game')).toHaveLength(1);
    expect(view.queryByText('2026 Tournament Console')).not.toBeInTheDocument();
    expect(view.queryByText('Sign out')).not.toBeInTheDocument();
    expect(view.getByLabelText('Switch to light theme')).toBeInTheDocument();

    fireEvent.click(view.getByText('archive'));

    expect(onTabChange).toHaveBeenCalledWith('archive');
  });

  it('places the theme toggle to the right of profile in the app nav', () => {
    const { container } = renderWithTheme(
      <PageShell
        activeTab="profile"
        navItems={fullNavItems}
        onTabChange={vi.fn()}
        userEmail="ian@example.com"
      >
        <div>Profile panel</div>
      </PageShell>
    );
    const nav = container.querySelector('nav div');
    const navChildren = Array.from(nav?.children ?? []);
    const profileIndex = navChildren.findIndex((child) => child.textContent === 'profile');
    const toggleIndex = navChildren.findIndex((child) =>
      child.getAttribute('aria-label')?.startsWith('Switch to')
    );

    expect(profileIndex).toBeGreaterThanOrEqual(0);
    expect(toggleIndex).toBe(profileIndex + 1);

    fireEvent.click(within(container).getByLabelText('Switch to light theme'));

    expect(document.documentElement).toHaveClass('light');
    expect(track2026).toHaveBeenCalledWith('theme_changed', {
      source: 'nav',
      theme: 'light',
    });
  });

  it('centers the active nav item within scroll bounds', () => {
    const scrollTo = vi.fn();
    const onTabChange = vi.fn();
    const { container, rerender } = renderWithTheme(
      <PageShell
        activeTab="score"
        navItems={fullNavItems}
        onTabChange={onTabChange}
        userEmail="ian@example.com"
      >
        <div>Active panel</div>
      </PageShell>
    );
    const scroller = container.querySelector('nav > div') as HTMLDivElement;
    const profileButton = within(container).getByText('profile').closest('button') as HTMLButtonElement;

    Object.defineProperty(scroller, 'scrollTo', { configurable: true, value: scrollTo });
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 620 });
    Object.defineProperty(profileButton, 'offsetLeft', { configurable: true, value: 560 });
    Object.defineProperty(profileButton, 'offsetWidth', { configurable: true, value: 70 });

    rerender(
      <ThemeProvider>
        <PageShell
          activeTab="profile"
          navItems={fullNavItems}
          onTabChange={onTabChange}
          userEmail="ian@example.com"
        >
          <div>Active panel</div>
        </PageShell>
      </ThemeProvider>
    );

    expect(scrollTo).toHaveBeenLastCalledWith({ left: 380, behavior: 'smooth' });
  });

  it('does not show the brand header for authenticated no-nav states', () => {
    const { container } = render(
      <PageShell userEmail="ian@example.com" isOnline onSignOut={vi.fn()}>
        <div>Create profile</div>
      </PageShell>
    );
    const view = within(container);

    expect(view.getByText('Create profile')).toBeInTheDocument();
    expect(view.getByText('ian@example.com')).toBeInTheDocument();
    expect(view.getByText('Sign out')).toBeInTheDocument();
    expect(view.queryByText('ruff ryders cup 2026')).not.toBeInTheDocument();
  });
});

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const navItems: AppNavItem<'score' | 'archive'>[] = [
  { id: 'score', label: 'My Game' },
  { id: 'archive', label: 'Archive' },
];

const fullNavItems: AppNavItem<'score' | 'leaderboard' | 'archive' | 'profile'>[] = [
  { id: 'score', label: 'My Game' },
  { id: 'leaderboard', label: 'Tournament' },
  { id: 'archive', label: 'Archive' },
  { id: 'profile', label: 'Profile' },
];

