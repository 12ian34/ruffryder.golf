import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageShell, type AppNavItem } from '../features/tournament2026/components/Layout';

describe('PageShell', () => {
  it('renders app navigation and handles tab changes', () => {
    const onTabChange = vi.fn();

    const { container } = render(
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

    fireEvent.click(view.getByText('archive'));

    expect(onTabChange).toHaveBeenCalledWith('archive');
  });
});

const navItems: AppNavItem<'score' | 'archive'>[] = [
  { id: 'score', label: 'My Game' },
  { id: 'archive', label: 'Archive' },
];

