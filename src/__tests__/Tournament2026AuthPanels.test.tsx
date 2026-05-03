import { fireEvent, render, within } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SignInPanel } from '../features/tournament2026/components/AuthPanels';

describe('SignInPanel', () => {
  it('uses brief Ruff Ryders access language instead of vendor auth copy', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onEmailChange = vi.fn();
    const { container } = render(
      <SignInPanel
        email="ian@example.com"
        notice={null}
        error={null}
        onEmailChange={onEmailChange}
        onSubmit={onSubmit}
      />
    );
    const view = within(container);

    expect(view.getByText('Al Reynolds Ruff Ryders Cup')).toBeInTheDocument();
    expect(view.getByText('Ruff Ryders Cup 2026')).toBeInTheDocument();
    expect(view.queryByText(/console/i)).not.toBeInTheDocument();
    expect(view.queryByText('Player entry')).not.toBeInTheDocument();
    expect(view.queryByText('Use the email linked to your player profile.')).not.toBeInTheDocument();
    expect(view.queryByText(/Private access/i)).not.toBeInTheDocument();
    expect(view.queryByText(/Supabase Sign In/i)).not.toBeInTheDocument();

    fireEvent.change(view.getByLabelText('Email'), { target: { value: 'ian+cup@example.com' } });
    fireEvent.click(view.getByText('Send link'));

    expect(onEmailChange).toHaveBeenCalledWith('ian+cup@example.com');
    expect(onSubmit).toHaveBeenCalled();
  });
});
