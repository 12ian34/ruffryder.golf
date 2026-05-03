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
  const shouldShowBrandHeader = !hasAppNav && !userEmail;
  const shouldShowAccountStrip = !hasAppNav && Boolean(userEmail);

  return (
    <div className="min-h-screen bg-[#050506] font-data text-[#E6EDF3]">
      {shouldShowBrandHeader && (
        <header className="border-b border-[#27272A] bg-[#09090B]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div>
                <p className="text-[10px] tracking-[0.22em] text-[#3FB950] sm:text-xs">
                  the al reynolds
                </p>
                <h1 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA] sm:text-2xl">
                  ruff ryders cup 2026
                </h1>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-0 pb-20 sm:gap-4 sm:px-4 sm:pt-4">
        {shouldShowAccountStrip && (
          <div className="mx-3 mb-3 flex flex-wrap items-center justify-end gap-2 pt-3 text-xs text-[#A1A1AA] sm:mx-0 sm:pt-0">
            <span
              className={`rounded border px-2 py-1 text-[10px] tracking-[0.14em] ${
                isOnline
                  ? 'border-[#3FB950]/60 text-[#3FB950]'
                  : 'border-[#F59E0B]/60 text-[#F59E0B]'
              }`}
            >
              {isOnline ? 'Live' : 'Offline'}
            </span>
            <span className="min-w-0 truncate">{userEmail}</span>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-11 whitespace-nowrap rounded border border-[#27272A] px-3 py-2 text-xs text-[#E6EDF3] hover:border-[#3FB950] hover:text-[#FAFAFA]"
              >
                Sign out
              </button>
            )}
          </div>
        )}
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
                  className={`relative flex min-h-11 shrink-0 items-center justify-center px-1 text-xs font-semibold lowercase tracking-[0.12em] transition-colors focus:outline-none focus-visible:text-[#FAFAFA] sm:text-[13px] ${
                    isActive
                      ? 'text-[#FAFAFA]'
                      : 'text-[#8B949E] hover:text-[#E6EDF3]'
                  }`}
                >
                  <span
                    className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-[width,background-color,box-shadow] ${
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
