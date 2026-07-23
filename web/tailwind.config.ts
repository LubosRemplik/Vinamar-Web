import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Presentation palette
        ink: '#1F3A34',
        paper: '#FBF8F3',
        // Secondary text: 4.86:1 on paper, so the 11px eyebrows still clear WCAG AA.
        sage: '#61716A',
        brass: '#A9885A', // 3.12:1 on paper — icons and rules clear the 3:1 bar for graphics
        line: '#E4DCCF',
        // Legacy tokens — still used by the admin screens
        terracotta: '#d9743f',
        ochre: '#e8a06a',
        sand: '#f3e6d4',
        sea: '#2c7a9e',
      },
      fontFamily: {
        script: ['var(--font-script)', 'cursive'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 58, 52, 0.04), 0 4px 16px rgba(31, 58, 52, 0.06)',
        cardHover: '0 2px 4px rgba(31, 58, 52, 0.06), 0 12px 32px rgba(31, 58, 52, 0.12)',
      },
      letterSpacing: {
        eyebrow: '0.34em',
        button: '0.16em',
      },
      // Jost has a small x-height, so it reads a size smaller than it measures.
      // Every step up to `xl` gains a pixel; `2xl` and above are headings and
      // keep the stock scale.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1.0625rem', { lineHeight: '1.625rem' }],
        lg: ['1.1875rem', { lineHeight: '1.8125rem' }],
        xl: ['1.3125rem', { lineHeight: '1.875rem' }],
      },
    },
  },
  plugins: [],
};
export default config;
