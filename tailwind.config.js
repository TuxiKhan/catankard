/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./apps/web/index.html",
    "./apps/web/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        catan: {
          red: '#c23b22',
          yellow: '#f3c13a',
          brick: '#b84d31',
          wood: '#2b580c',
          wool: '#98d8aa',
          wheat: '#e3b04b',
          ore: '#686d76',
          board: '#1e293b',
          cardBg: '#fffbf0',
        }
      }
    },
  },
  plugins: [],
};
