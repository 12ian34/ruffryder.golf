import type { FormEvent, ReactNode } from 'react';

export function PageShell({
  children,
  userEmail,
  onSignOut,
}: {
  children: ReactNode;
  userEmail?: string | null;
  onSignOut?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#050505] font-data text-[#E6EDF3]">
      <header className="border-b border-[#27272A] bg-[#09090B]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#3FB950]">Ruff Ryders Cup</p>
            <h1 className="text-2xl font-bold tracking-[-0.04em] text-[#FAFAFA]">2026 Tournament Console</h1>
          </div>
          {userEmail && (
            <div className="flex items-center gap-3 text-sm text-[#A1A1AA]">
              <span className="hidden sm:inline">{userEmail}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded border border-[#27272A] px-3 py-1 text-[#E6EDF3] hover:border-[#3FB950]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">{children}</main>
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[#3FB950]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#FAFAFA]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SetupForm({
  title,
  children,
  error,
  onSubmit,
}: {
  title: string;
  children: ReactNode;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-[#27272A] bg-[#18181B] p-4">
      <h3 className="font-bold text-[#FAFAFA]">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
      {error && <p className="mt-3 text-sm text-[#F85149]">{error}</p>}
    </form>
  );
}

export function StatusCard({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
}) {
  const toneClass = {
    neutral: 'border-[#27272A] bg-[#18181B] text-[#A1A1AA]',
    success: 'border-[#3FB950]/60 bg-[#06170B] text-[#3FB950]',
    warning: 'border-[#F59E0B]/60 bg-[#1C1406] text-[#F59E0B]',
    error: 'border-[#F85149]/60 bg-[#1F0A0A] text-[#F85149]',
  }[tone];

  return <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
}
