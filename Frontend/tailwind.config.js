/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apollo: {
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#B8DBFF',
          300: '#7AB7FF',
          400: '#3890FE',
          500: '#0066F5',
          600: '#0058D6',
          700: '#0047B3',
          800: '#003A8F',
          900: '#002B6B',
          DEFAULT: '#0066F5',
        },
        dock: {
          DEFAULT: '#0B132B',
          dark: '#080E20',
          hover: '#172244',
          active: '#1E2D5A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          subtle: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
