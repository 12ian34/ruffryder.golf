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
      >
        <div>Active panel</div>
      </PageShell>
    );
    const view = within(container);

    expect(view.getByText('Active panel')).toBeInTheDocument();
    expect(view.getAllByText('Score')).toHaveLength(1);
    expect(view.queryByText('2026 Tournament Console')).not.toBeInTheDocument();

    fireEvent.click(view.getByText('History'));

    expect(onTabChange).toHaveBeenCalledWith('history');
  });
});

const navItems: AppNavItem<'score' | 'history'>[] = [
  { id: 'score', label: 'Score' },
  { id: 'history', label: 'History' },
];

