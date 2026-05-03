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
  const [hasCheckedEmail, setHasCheckedEmail] = useState(false);
  const emailFeedback = getEmailFeedback(email);
  const shouldShowEmailFeedback = hasCheckedEmail && Boolean(emailFeedback);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setHasCheckedEmail(true);

    if (emailFeedback) {
      event.preventDefault();
      return;
    }

    onSubmit(event);
  };

  return (
    <section className="flex min-h-[calc(100vh-1px)] flex-col bg-[#050505] px-4 py-10 font-data text-[#E6EDF3] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
        <p className="text-[10px] font-bold tracking-[0.24em] text-[#3FB950]">
          the al reynolds
        </p>
        <h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.08em] text-[#FAFAFA] sm:text-6xl">
          ruff ryders cup 2026
        </h1>
        <form noValidate onSubmit={handleSubmit} className="mt-8 grid gap-3 border-t border-[#27272A] pt-5">
          <label htmlFor="signin-email" className="block text-xs tracking-[0.14em] text-[#8B949E]">
            email
          </label>
          <input
            id="signin-email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onBlur={() => setHasCheckedEmail(true)}
            type="email"
            required
            placeholder="the.hologram@wycombe-shites.gov.uk"
            aria-invalid={shouldShowEmailFeedback}
            aria-describedby={shouldShowEmailFeedback ? 'signin-email-feedback' : undefined}
            className={`min-h-11 w-full rounded-md border bg-[#050505] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none ${
              shouldShowEmailFeedback ? 'border-[#F85149] focus:border-[#F85149]' : 'border-[#27272A] focus:border-[#3FB950]'
            }`}
          />
          {shouldShowEmailFeedback && (
            <p id="signin-email-feedback" className="text-xs text-[#F85149]">
              {emailFeedback}
            </p>
          )}
          <button
            type="submit"
            disabled={isSendDisabled}
            className="min-h-11 rounded-md bg-[#3FB950] px-4 py-2 font-data text-sm font-black tracking-[0.12em] text-[#09090B] disabled:opacity-60"
          >
            {getSignInButtonLabel(isSubmitting, cooldownSeconds)}
          </button>
        </form>
        {notice && <StatusCard tone="success">{notice}</StatusCard>}
        {error && <StatusCard tone="error">{error}</StatusCard>}
      </div>
      <footer className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#27272A] pt-4 text-xs text-[#8B949E]">
        <a
          href="https://github.com/12ian34/ruffryder.golf"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#E6EDF3]"
        >
          source code
        </a>
        <span className="text-[#3FB950]" aria-hidden="true">
          //
        </span>
        <a
          href="https://buymeacoffee.com/12ian34"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#E6EDF3]"
        >
          donate to ai overlords
        </a>
      </footer>
    </section>
  );
}

function getEmailFeedback(email: string): string | null {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return 'enter an email address';
  }

  if (!isPlausibleEmailAddress(trimmedEmail)) {
    return 'enter a real email address';
  }

  return null;
}

function isPlausibleEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function getSignInButtonLabel(isSubmitting: boolean, cooldownSeconds: number): string {
  if (isSubmitting) {
    return 'sending...';
  }

  if (cooldownSeconds > 0) {
    return `wait ${cooldownSeconds}s`;
  }

  return 'send link';
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
