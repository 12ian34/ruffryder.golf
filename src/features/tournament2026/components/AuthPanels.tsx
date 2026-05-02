import { FormEvent, useState } from 'react';
import { createOwnProfile } from '../../../services/tournament2026Queries';
import { getErrorMessage } from '../viewUtils';
import { SubmitButton, TextField } from './FormControls';
import { Panel, SetupForm, StatusCard } from './Layout';

export function SignInPanel({
  email,
  notice,
  error,
  onEmailChange,
  onSubmit,
  isSubmitting = false,
  cooldownSeconds = 0,
}: {
  email: string;
  notice: string | null;
  error: string | null;
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
  cooldownSeconds?: number;
}) {
  const isSendDisabled = isSubmitting || cooldownSeconds > 0;

  return (
    <Panel title="Supabase Sign In" eyebrow="2026 rebuild">
      <p className="max-w-2xl text-sm text-[#A1A1AA]">
        The 2026 screens use Supabase Auth and Supabase RLS. Sign in here before using the new
        admin, scoring, leaderboard, or history views.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-[#E6EDF3] outline-none focus:border-[#3FB950]"
        />
        <button
          type="submit"
          disabled={isSendDisabled}
          className="rounded-md bg-[#3FB950] px-4 py-2 font-data text-sm font-bold text-[#09090B] disabled:opacity-60"
        >
          {getSignInButtonLabel(isSubmitting, cooldownSeconds)}
        </button>
      </form>
      {notice && <StatusCard tone="success">{notice}</StatusCard>}
      {error && <StatusCard tone="error">{error}</StatusCard>}
    </Panel>
  );
}

function getSignInButtonLabel(isSubmitting: boolean, cooldownSeconds: number): string {
  if (isSubmitting) {
    return 'Sending...';
  }

  if (cooldownSeconds > 0) {
    return `Wait ${cooldownSeconds}s`;
  }

  return 'Send Link';
}

export function CreateProfilePanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createOwnProfile({ displayName });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel title="Create Supabase Profile" eyebrow="First-time setup">
      <SetupForm title="Profile" onSubmit={handleSubmit} error={error}>
        <TextField label="Display name" value={displayName} onChange={setDisplayName} />
        <SubmitButton isSaving={isSaving}>Create profile</SubmitButton>
      </SetupForm>
    </Panel>
  );
}
