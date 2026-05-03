import { fireEvent, render, within } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SignInPanel } from '../features/tournament2026/components/AuthPanels';

describe('SignInPanel', () => {
  it('uses Ruff Ryders access language instead of vendor auth copy', () => {
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

    expect(view.getByText('Ruff Ryders Cup')).toBeInTheDocument();
    expect(view.getByText('2026 Scoring Console')).toBeInTheDocument();
    expect(view.getByText('Get your match link')).toBeInTheDocument();
    expect(view.queryByText(/Supabase Sign In/i)).not.toBeInTheDocument();

    fireEvent.change(view.getByLabelText('Email'), { target: { value: 'ian+cup@example.com' } });
    fireEvent.click(view.getByText('Send access link'));

    expect(onEmailChange).toHaveBeenCalledWith('ian+cup@example.com');
    expect(onSubmit).toHaveBeenCalled();
  });
});
