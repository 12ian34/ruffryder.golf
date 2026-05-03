import type { FormEvent, ReactNode } from 'react';

export interface AppNavItem<T extends string> {
  id: T;
  label: string;
  shortLabel?: string;
}

export function PageShell<T extends string>({
  children,
  userEmail,
  isOnline = true,
  onSignOut,
  activeTab,
  navItems = [],
  onTabChange,
}: {
  children: ReactNode;
  userEmail?: string | null;
  isOnline?: boolean;
  onSignOut?: () => void;
  activeTab?: T;
  navItems?: AppNavItem<T>[];
  onTabChange?: (tab: T) => void;
}) {
  const hasAppNav = navItems.length > 0 && Boolean(activeTab) && Boolean(onTabChange);

  return (
    <div className="min-h-screen bg-[#050505] font-data text-[#E6EDF3]">
      {!hasAppNav && (
        <header className="border-b border-[#27272A] bg-[#09090B]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#3FB950] sm:text-xs">Ruff Ryders Cup</p>
                <h1 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA] sm:text-2xl">
                  2026 Tournament Console
                </h1>
              </div>
            </div>
            {userEmail && (
              <div className="flex shrink-0 items-center gap-3 text-sm text-[#A1A1AA]">
                <span
                  className={`hidden rounded border px-2 py-1 text-[10px] uppercase tracking-[0.14em] sm:inline ${
                    isOnline
                      ? 'border-[#3FB950]/60 text-[#3FB950]'
                      : 'border-[#F59E0B]/60 text-[#F59E0B]'
                  }`}
                >
                  {isOnline ? 'Live' : 'Offline'}
                </span>
                <span className="hidden sm:inline">{userEmail}</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="whitespace-nowrap rounded border border-[#27272A] px-2.5 py-2 text-xs text-[#E6EDF3] hover:border-[#3FB950] sm:px-3 sm:py-1 sm:text-sm"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-0 pb-24 sm:gap-4 sm:px-4 sm:pt-4">
        {children}
      </main>
      {navItems.length > 0 && activeTab && onTabChange && (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full border-t border-white/10 bg-[linear-gradient(180deg,rgba(9,9,11,0.72)_0%,rgba(9,9,11,0.96)_100%)] shadow-[0_-10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop-saturate-150" />
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex w-12 items-center justify-start bg-gradient-to-r from-[#09090B]/95 to-transparent pl-2 text-lg text-[#3FB950]/50">
            ‹
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 flex w-12 items-center justify-end bg-gradient-to-l from-[#09090B]/95 to-transparent pr-2 text-lg text-[#3FB950]/50">
            ›
          </div>
          <div className="relative z-20 mx-auto flex max-w-screen-2xl gap-1 overflow-x-auto px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = item.id === activeTab;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`min-w-[5.25rem] rounded-md border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors sm:min-w-[6.5rem] sm:text-xs ${
                    isActive
                      ? 'border-[#3FB950]/80 bg-[#06170B]/90 text-[#3FB950]'
                      : 'border-white/5 bg-white/[0.03] text-[#A1A1AA] hover:border-[#27272A] hover:bg-white/[0.06] hover:text-[#E6EDF3]'
                  }`}
                >
                  {item.shortLabel ?? item.label}
                </button>
              );
            })}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="min-w-[5.25rem] rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#F85149] hover:bg-[#1F0A0A]/70 hover:text-[#F85149] sm:min-w-[6.5rem] sm:text-xs"
              >
                Sign out
              </button>
            )}
          </div>
        </nav>
      )}
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
    <section className="border-y border-[#27272A] bg-[#0A0A0B] px-4 py-4 sm:rounded-lg sm:border sm:bg-[#0F0F11] sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#3FB950]">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-bold tracking-[-0.06em] text-[#FAFAFA] sm:text-4xl">{title}</h2>
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
