import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Presentation palette
        ink: '#1F3A34',
        paper: '#FBF8F3',
        sage: '#8A9A93',
        brass: '#C6A87C',
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
    },
  },
  plugins: [],
};
export default config;
