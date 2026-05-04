import { useTheme, type Theme } from '../../../contexts/ThemeContext';
import { track2026 } from '../../../utils/analytics';

export function ThemeToggle({
  className = '',
  source,
}: {
  className?: string;
  source: 'login' | 'signup' | 'nav';
}) {
  const { theme, setTheme } = useTheme();
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
  const isLight = theme === 'light';

  const toggleTheme = () => {
    setTheme(nextTheme);
    track2026('theme_changed', {
      source,
      theme: nextTheme,
    });
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={isLight}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#27272A] bg-[#09090B] transition-colors duration-300 hover:border-[#3FB950] hover:text-[#FAFAFA] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3FB950] ${
        isLight ? 'text-[#F59E0B]' : 'text-[#58A6FF]'
      } ${className}`}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center transition duration-500 ease-out ${
          isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
        }`}
        aria-hidden="true"
      >
        <SunIcon />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition duration-500 ease-out ${
          isLight ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
        aria-hidden="true"
      >
        <MoonIcon />
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M6.7 6.7 5.64 5.64M18.36 18.36 17.3 17.3M17.3 6.7l1.06-1.06M5.64 18.36 6.7 17.3" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.2 14.7A7.4 7.4 0 0 1 9.3 3.8 8.2 8.2 0 1 0 20.2 14.7Z"
      />
    </svg>
  );
}
