/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          dark: '#081C15',
          light: '#2D6A4F',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F4E4A6',
          dark: '#B8941F',
        },
      },
    },
  },
  plugins: [],
}
