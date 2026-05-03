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
    <section className="min-h-[calc(100vh-1px)] bg-[#050505] px-4 py-8 font-data text-[#E6EDF3] sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-xl border border-[#27272A] bg-[#09090B] p-5 shadow-[0_0_80px_rgba(63,185,80,0.08)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(63,185,80,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(88,166,255,0.13),transparent_28%)]" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#3FB950]">
              Ruff Ryders Cup
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-black uppercase leading-none tracking-[-0.08em] text-[#FAFAFA] sm:text-4xl">
              2026 Scoring Console
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
              Private match-day access for players, captains, and the poor soul keeping the card honest.
              No passwords. No clubhouse paperwork. Just a one-time link to enter the arena.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.16em] text-[#8B949E]">
              <AccessStat label="Format" value="Match play" />
              <AccessStat label="Scoring" value="Live" />
              <AccessStat label="Access" value="Invite only" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,17,0.9),rgba(9,9,11,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B949E]">Player entry</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.05em] text-[#FAFAFA]">Get your match link</h2>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            Use the email your profile was created with. We will send a fresh access link.
          </p>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <label className="block text-xs uppercase tracking-[0.14em] text-[#8B949E]">
              Email
              <input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1 min-h-11 w-full rounded-md border border-[#27272A] bg-[#050505] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
              />
            </label>
            <button
              type="submit"
              disabled={isSendDisabled}
              className="min-h-11 rounded-md bg-[#3FB950] px-4 py-2 font-data text-sm font-black uppercase tracking-[0.12em] text-[#09090B] disabled:opacity-60"
            >
              {getSignInButtonLabel(isSubmitting, cooldownSeconds)}
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-[#8B949E]">
            Link expired? Request another. The cooldown keeps the email cannon under control.
          </p>
          {notice && <StatusCard tone="success">{notice}</StatusCard>}
          {error && <StatusCard tone="error">{error}</StatusCard>}
        </div>
      </div>
    </section>
  );
}

function AccessStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#050505]/70 px-3 py-2">
      <p>{label}</p>
      <p className="mt-1 font-bold text-[#E6EDF3]">{value}</p>
    </div>
  );
}

function getSignInButtonLabel(isSubmitting: boolean, cooldownSeconds: number): string {
  if (isSubmitting) {
    return 'Sending...';
  }

  if (cooldownSeconds > 0) {
    return `Wait ${cooldownSeconds}s`;
  }

  return 'Send access link';
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
    <Panel title="Create Profile" eyebrow="First-time access">
      <SetupForm title="Profile" onSubmit={handleSubmit} error={error}>
        <TextField label="Display name" value={displayName} onChange={setDisplayName} />
        <SubmitButton isSaving={isSaving}>Create profile</SubmitButton>
      </SetupForm>
    </Panel>
  );
}
