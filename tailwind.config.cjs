/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist Mono', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Geist Mono', 'SF Mono', 'Menlo', 'monospace'],
        data: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          700: '#18181B',
          800: '#0F0F11',
          900: '#0C0C0E',
          950: '#09090B',
        },
        chalk: {
          50: '#FAFAFA',
          100: '#E6EDF3',
          200: '#D4D4D8',
          300: '#A1A1AA',
          400: '#8B949E',
          500: '#71717A',
          700: '#3F3F46',
          800: '#27272A',
        },
        fairway: {
          300: '#7EE787',
          500: '#3FB950',
          600: '#2EA043',
          700: '#238636',
          950: '#06170B',
        },
        pin: {
          200: '#FDE68A',
          300: '#FBBF24',
          500: '#F59E0B',
          950: '#1C1406',
        },
        'team-usa': {
          300: '#FACC15',
          500: '#F2B84B',
          700: '#A96E12',
        },
        'team-europe': {
          300: '#58A6FF',
          500: '#58A6FF',
          700: '#1D4ED8',
        },
        usa: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#fbbf24',  // Legacy USA color (amber)
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        europe: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a78bfa',  // Legacy Europe color (purple)
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Main success color (green)
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-in-out',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: '#a78bfa',
              '&:hover': {
                color: '#9333ea',
              },
            },
            h1: {
              color: 'inherit',
            },
            h2: {
              color: 'inherit',
            },
            h3: {
              color: 'inherit',
            },
            h4: {
              color: 'inherit',
            },
            code: {
              color: 'inherit',
              backgroundColor: 'rgb(var(--tw-prose-pre-bg))',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: 'rgb(var(--tw-prose-pre-bg))',
              color: 'inherit',
            },
            strong: {
              color: 'inherit',
            },
            blockquote: {
              color: 'inherit',
              borderLeftColor: 'rgb(var(--tw-prose-quote-borders))',
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': 'var(--tw-prose-invert-body)',
            '--tw-prose-headings': 'var(--tw-prose-invert-headings)',
            '--tw-prose-links': 'var(--tw-prose-invert-links)',
            '--tw-prose-pre-bg': 'var(--tw-prose-invert-pre-bg)',
            '--tw-prose-quote-borders': 'var(--tw-prose-invert-quote-borders)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}