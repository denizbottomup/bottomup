import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette (matches mobile app's orange/dark theme)
        bg: {
          DEFAULT: '#0B0D10',
          card: '#14171B',
          elev: '#1C2025',
        },
        brand: {
          DEFAULT: '#FF6B1A',
          soft: '#FFB88A',
          dark: '#D14F00',
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
    },
  },
  plugins: [],
};

export default config;
