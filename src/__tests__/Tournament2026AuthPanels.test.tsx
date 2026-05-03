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

    expect(view.getByText('the al reynolds')).toBeInTheDocument();
    expect(view.getByText('ruff ryders cup 2026')).toBeInTheDocument();
    expect(view.queryByText(/console/i)).not.toBeInTheDocument();
    expect(view.queryByText('Player entry')).not.toBeInTheDocument();
    expect(view.queryByText('Use the email linked to your player profile.')).not.toBeInTheDocument();
    expect(view.queryByText(/Private access/i)).not.toBeInTheDocument();
    expect(view.queryByText(/Supabase Sign In/i)).not.toBeInTheDocument();
    expect(view.getByPlaceholderText('the.hologram@wycombe-shites.gov.uk')).toBeInTheDocument();
    expect(view.getByText('source code')).toHaveAttribute(
      'href',
      'https://github.com/12ian34/ruffryder.golf'
    );
    expect(view.getByText('donate to ai overlords')).toHaveAttribute(
      'href',
      'https://buymeacoffee.com/12ian34'
    );

    fireEvent.change(view.getByLabelText('email'), { target: { value: 'ian+cup@example.com' } });
    fireEvent.click(view.getByText('send link'));

    expect(onEmailChange).toHaveBeenCalledWith('ian+cup@example.com');
    expect(onSubmit).toHaveBeenCalled();
  });

  it('blocks invalid email submissions with feedback', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const { container } = render(
      <SignInPanel
        email="not-an-email"
        notice={null}
        error={null}
        onEmailChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    const view = within(container);

    fireEvent.click(view.getByText('send link'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('enter a real email address')).toBeInTheDocument();
    expect(view.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true');
  });
});
