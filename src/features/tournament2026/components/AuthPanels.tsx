import { FormEvent, useState } from 'react';
import { createOwnProfile } from '../../../services/tournament2026Queries';
import { getErrorMessage } from '../viewUtils';
import { AvatarEmojiPicker } from './AvatarEmojiPicker';
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
    <section className="min-h-[calc(100vh-1px)] bg-[#050505] px-4 py-10 font-data text-[#E6EDF3] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#3FB950]">
          Al Reynolds Ruff Ryders Cup
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.08em] text-[#FAFAFA] sm:text-6xl">
          Ruff Ryders Cup 2026
        </h1>
        <form onSubmit={onSubmit} className="mt-8 grid gap-3 border-t border-[#27272A] pt-5">
          <label className="block text-xs uppercase tracking-[0.14em] text-[#8B949E]">
            Email
            <input
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className="mt-2 min-h-11 w-full rounded-md border border-[#27272A] bg-[#050505] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
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
        {notice && <StatusCard tone="success">{notice}</StatusCard>}
        {error && <StatusCard tone="error">{error}</StatusCard>}
      </div>
    </section>
  );
}

function getSignInButtonLabel(isSubmitting: boolean, cooldownSeconds: number): string {
  if (isSubmitting) {
    return 'Sending...';
  }

  if (cooldownSeconds > 0) {
    return `Wait ${cooldownSeconds}s`;
  }

  return 'Send link';
}

export function CreateProfilePanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createOwnProfile({ displayName, customEmoji: customEmoji || null });
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
        <AvatarEmojiPicker value={customEmoji} onChange={setCustomEmoji} disabled={isSaving} />
        <SubmitButton isSaving={isSaving}>Create profile</SubmitButton>
      </SetupForm>
    </Panel>
  );
}
