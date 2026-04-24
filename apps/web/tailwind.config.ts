import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0D10',
          card: '#14171B',
          elev: '#1C2025',
        },
        // Primary brand orange (logo top-right arrow)
        brand: {
          DEFAULT: '#FF8A4C',
          soft: '#FFB88A',
          dark: '#E56B1A',
        },
        // Logo palette — used across gradients on the marketing site
        orange: {
          DEFAULT: '#FF8A4C',
        },
        violet: {
          DEFAULT: '#7C5CFF',
          soft: '#A994FF',
        },
        sky: {
          DEFAULT: '#3B5BFF',
          soft: '#7D93FF',
        },
        mint: {
          DEFAULT: '#2BC18B',
          soft: '#7CE0B8',
        },
        fg: {
          DEFAULT: '#E8EAED',
          muted: '#8B9097',
          dim: '#5A616B',
        },
        border: {
          DEFAULT: '#23272D',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['84px', { lineHeight: '0.96', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg': ['64px', { lineHeight: '1.02', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
    },
  },
  plugins: [],
};

export default config;
