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
                <p className="text-[10px] tracking-[0.22em] text-[#3FB950] sm:text-xs">
                  Al Reynolds Ruff Ryders Cup
                </p>
                <h1 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA] sm:text-2xl">
                  Ruff Ryders Cup 2026
                </h1>
              </div>
            </div>
            {userEmail && (
              <div className="flex shrink-0 items-center gap-3 text-sm text-[#A1A1AA]">
                <span
                  className={`hidden rounded border px-2 py-1 text-[10px] tracking-[0.14em] sm:inline ${
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
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-0 pb-20 sm:gap-4 sm:px-4 sm:pt-4">
        {children}
      </main>
      {navItems.length > 0 && activeTab && onTabChange && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#09090B]/25 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-18px_54px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl backdrop-saturate-200">
          <div className="relative z-20 mx-auto flex max-w-screen-2xl items-end gap-6 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-8 [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = item.id === activeTab;
              const label = (item.shortLabel ?? item.label).toLowerCase();

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex h-10 shrink-0 items-center justify-center px-1 text-xs font-semibold lowercase tracking-[0.12em] transition-colors focus:outline-none focus-visible:text-[#FAFAFA] sm:text-[13px] ${
                    isActive
                      ? 'text-[#FAFAFA]'
                      : 'text-[#8B949E] hover:text-[#E6EDF3]'
                  }`}
                >
                  <span
                    className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all ${
                      isActive
                        ? 'w-full bg-[#3FB950] shadow-[0_0_14px_rgba(63,185,80,0.95)]'
                        : 'w-0 bg-transparent'
                    }`}
                  />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
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
    <section className="border-y border-[#27272A] bg-[#0A0A0B] px-3 py-3 sm:rounded-lg sm:border sm:bg-[#0F0F11] sm:p-4">
      <p className="text-[10px] tracking-[0.24em] text-[#3FB950]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-[-0.05em] text-[#FAFAFA] sm:text-3xl">{title}</h2>
      <div className="mt-3">{children}</div>
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
    <form onSubmit={onSubmit} className="rounded-lg border border-[#27272A] bg-[#18181B] p-3">
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

  return <div className={`mt-3 rounded-md border px-3 py-2.5 text-sm ${toneClass}`}>{children}</div>;
}
