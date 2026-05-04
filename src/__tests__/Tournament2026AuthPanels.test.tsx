import { fireEvent, render, within } from '@testing-library/react';
import type { FormEvent, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CreateProfilePanel, SignInPanel } from '../features/tournament2026/components/AuthPanels';
import { track2026 } from '../utils/analytics';

vi.mock('../utils/analytics', () => ({
  track2026: vi.fn(),
}));

describe('SignInPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    vi.clearAllMocks();
  });

  it('uses brief Ruff Ryders access language instead of vendor auth copy', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onEmailChange = vi.fn();
    const { container } = renderWithTheme(
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
    expect(view.getByLabelText('Switch to light theme')).toBeInTheDocument();
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
    const { container } = renderWithTheme(
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

  it('switches the login screen between dark and light themes', () => {
    const { container } = renderWithTheme(
      <SignInPanel
        email="ian@example.com"
        notice={null}
        error={null}
        onEmailChange={vi.fn()}
        onSubmit={vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())}
      />
    );
    const view = within(container);

    fireEvent.click(view.getByLabelText('Switch to light theme'));

    expect(document.documentElement).toHaveClass('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
    expect(track2026).toHaveBeenCalledWith('theme_changed', {
      source: 'login',
      theme: 'light',
    });
  });

  it('keeps the theme toggle available during first-time profile creation', () => {
    const { container } = renderWithTheme(<CreateProfilePanel onSaved={vi.fn().mockResolvedValue(undefined)} />);
    const view = within(container);

    fireEvent.click(view.getByLabelText('Switch to light theme'));

    expect(view.getByText('Create Profile')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('light');
    expect(track2026).toHaveBeenCalledWith('theme_changed', {
      source: 'signup',
      theme: 'light',
    });
  });
});

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
