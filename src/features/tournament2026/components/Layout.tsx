import type { FormEvent, ReactNode } from 'react';

export interface AppNavItem<T extends string> {
  id: T;
  label: string;
  shortLabel?: string;
}

export function PageShell<T extends string>({
  children,
  userEmail,
  onSignOut,
  activeTab,
  navItems = [],
  onTabChange,
}: {
  children: ReactNode;
  userEmail?: string | null;
  onSignOut?: () => void;
  activeTab?: T;
  navItems?: AppNavItem<T>[];
  onTabChange?: (tab: T) => void;
}) {
  return (
    <div className="min-h-screen bg-[#050505] font-data text-[#E6EDF3]">
      <header className="sticky top-0 z-40 border-b border-[#27272A] bg-[#09090B]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#3FB950] sm:text-xs">Ruff Ryders Cup</p>
              <h1 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA] sm:text-2xl">
                2026 Tournament Console
              </h1>
            </div>
            {navItems.length > 0 && activeTab && onTabChange && (
              <nav className="mt-3 hidden flex-wrap gap-2 sm:flex">
                {navItems.map((item) => {
                  const isActive = item.id === activeTab;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                        isActive
                          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                          : 'border-[#27272A] text-[#8B949E] hover:border-[#3F3F46] hover:text-[#E6EDF3]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
          {userEmail && (
            <div className="flex shrink-0 items-center gap-3 text-sm text-[#A1A1AA]">
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
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-0 pb-24 sm:gap-4 sm:px-4 sm:pb-6 sm:pt-4">
        {children}
      </main>
      {navItems.length > 0 && activeTab && onTabChange && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#27272A] bg-[#09090B]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {navItems.map((item) => {
              const isActive = item.id === activeTab;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`rounded-md border px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                      : 'border-transparent text-[#8B949E]'
                  }`}
                >
                  {item.shortLabel ?? item.label}
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
