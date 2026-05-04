import { useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

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
  const navScrollerRef = useRef<HTMLDivElement | null>(null);
  const activeNavItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!hasAppNav) return;

    const scroller = navScrollerRef.current;
    const activeItem = activeNavItemRef.current;

    if (!scroller || !activeItem) return;

    const maxScrollLeft = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);
    const centeredScrollLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - scroller.clientWidth / 2;
    const nextScrollLeft = Math.min(Math.max(centeredScrollLeft, 0), maxScrollLeft);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({
        left: nextScrollLeft,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
      return;
    }

    scroller.scrollLeft = nextScrollLeft;
  }, [activeTab, hasAppNav, navItems.length]);

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
        <nav
          aria-label="Primary app navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#09090B]/25 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-18px_54px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl backdrop-saturate-200"
        >
          <div
            ref={navScrollerRef}
            className="relative z-20 mx-auto flex max-w-screen-2xl items-end gap-6 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-8 [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const isActive = item.id === activeTab;
              const label = (item.shortLabel ?? item.label).toLowerCase();

              return (
                <button
                  key={item.id}
                  ref={isActive ? activeNavItemRef : undefined}
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
                        ? 'rr-nav-active-underline w-full bg-[#3FB950] shadow-[0_0_14px_rgba(63,185,80,0.95)]'
                        : 'w-0 bg-transparent'
                    }`}
                  />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
            <ThemeToggle source="nav" className="self-center" />
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

export function TerminalPageSection({
  title,
  titleId,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  titleId?: string;
  eyebrow: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="relative overflow-hidden border-y border-[#27272A] bg-[#050506] sm:-mx-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#F2B84B]/70 via-[#3FB950]/60 to-[#58A6FF]/70" />
      <header className="relative grid gap-4 border-b border-[#27272A] px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[10px] lowercase tracking-[0.24em] text-[#3FB950]">{eyebrow}</p>
          <h2
            id={titleId}
            className="mt-1 text-2xl font-bold lowercase tracking-[-0.06em] text-[#FAFAFA] sm:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm lowercase leading-6 text-[#A1A1AA]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-end gap-3 lowercase lg:justify-end">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function CollapsibleSection({
  title,
  description,
  eyebrow,
  meta,
  defaultOpen = false,
  className = '',
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={`group border-b border-[#27272A] bg-[#050506] ${className}`}>
      <summary className="grid cursor-pointer list-none gap-3 px-3 py-3 transition hover:bg-[#0C0C0E] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[10px] tracking-[0.22em] text-[#3FB950]">{eyebrow}</p> : null}
          <p className="text-sm font-bold tracking-[-0.02em] text-[#FAFAFA] sm:text-base">{title}</p>
          {description ? <p className="mt-1 text-xs leading-5 text-[#8B949E]">{description}</p> : null}
        </div>
        <span className="flex items-center gap-3 text-[10px] tracking-[0.14em] text-[#8B949E] sm:justify-end">
          {meta ? <span className="border border-[#27272A] px-2 py-1">{meta}</span> : null}
          <span className="text-[#3FB950]">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Hide</span>
            <span className="ml-1 inline-block transition group-open:rotate-90">&gt;</span>
          </span>
        </span>
      </summary>
      <div className="border-t border-[#27272A]">{children}</div>
    </details>
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
    <form onSubmit={onSubmit} className="rounded-lg border border-[#27272A] bg-[#050506] p-3">
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
