/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soccer: {
          dark: '#030712', // slate-950
          pitch: '#15803d', // green-700
          gold: '#f59e0b', // amber-500
          goldglow: '#fbbf24', // amber-400
          card: 'rgba(15, 23, 42, 0.65)' // sleek glassmorphism
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sports: ['Montserrat', 'Impact', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
