/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Solo activa modo oscuro con clase 'dark' en <html>
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic theme colors (CSS variables from ThemeProvider)
        primary: {
          DEFAULT: 'var(--color-primary, #f9a8d4)',
          light: 'var(--color-primary-light, #fbcfe8)',
          dark: 'var(--color-primary-dark, #EC4899)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #fbcfe8)',
          light: 'var(--color-secondary-light, #fce7f3)',
          dark: 'var(--color-secondary-dark, #f9a8d4)',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #db2777)',
          light: 'var(--color-accent-light, #ec4899)',
          dark: 'var(--color-accent-dark, #be185d)',
        },
        background: {
          light: 'var(--color-bg-light, #fff5f7)',
          dark: 'var(--color-bg-dark, #2d1b24)',
        },
        surface: {
          DEFAULT: 'var(--color-surface, #ffffff)',
          elevated: 'var(--color-surface-elevated, #ffffff)',
        },
        text: {
          DEFAULT: 'var(--color-text, #1E293B)',
          muted: 'var(--color-on-surface-muted, #64748b)',
        },
        // Static colors (not themeable)
        gold: "#D4AF37",
        silver: "#C0C0C0",
        bronze: "#CD7F32",
        // Semantic colors
        success: 'var(--color-success, #10B981)',
        warning: 'var(--color-warning, #F59E0B)',
        error: 'var(--color-error, #EF4444)',
        info: 'var(--color-info, #3B82F6)',
      },
      fontFamily: {
        display: ["var(--font-display)", "cursive"],
        serif: ["var(--font-heading)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        'theme': '0 10px 15px -3px var(--color-primary-alpha, rgba(0,0,0,0.1))',
        'theme-lg': '0 20px 25px -5px var(--color-primary-alpha, rgba(0,0,0,0.1))',
      },
      borderColor: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        DEFAULT: 'var(--color-border)',
      },
      textColor: {
        primary: 'var(--color-text)',
        muted: 'var(--color-on-surface-muted)',
      },
    },
  },
  plugins: [],
}
