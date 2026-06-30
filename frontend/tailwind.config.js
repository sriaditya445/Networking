/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        enterprise: {
          dark: '#070a13',
          darker: '#04060b',
          navy: '#0b0f19',
          glass: 'rgba(17, 25, 40, 0.55)',
          border: 'rgba(255, 255, 255, 0.07)',
          hover: 'rgba(255, 255, 255, 0.12)',
          accent: '#06b6d4',
          accentPurple: '#a855f7',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
