import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: '#d9743f',
        ochre: '#e8a06a',
        sand: '#f3e6d4',
        sea: '#2c7a9e',
        ink: '#3d3a35',
      },
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(61, 58, 53, 0.04), 0 4px 16px rgba(61, 58, 53, 0.06)',
        cardHover: '0 2px 4px rgba(61, 58, 53, 0.06), 0 12px 32px rgba(61, 58, 53, 0.12)',
      },
    },
  },
  plugins: [],
};
export default config;
