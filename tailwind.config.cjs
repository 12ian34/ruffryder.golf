/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        usa: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#fbbf24',  // Main USA color (amber)
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
          500: '#a78bfa',  // Main Europe color (purple)
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