/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f9a8d4",
        secondary: "#fbcfe8",
        accent: "#db2777",
        "background-light": "#fff5f7",
        "background-dark": "#2d1b24",
        gold: "#D4AF37",
        silver: "#C0C0C0",
        bronze: "#CD7F32",
      },
      fontFamily: {
        display: ["Great Vibes", "cursive"],
        serif: ["Playfair Display", "serif"],
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
}
