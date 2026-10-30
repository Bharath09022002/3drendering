/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F6FAF8',
        ink: '#0B1F1A',
        primary: {
          DEFAULT: '#0B7F63',
          dark: '#08634D',
          light: '#DDF3EB'
        },
        primaryFill: '#0FA37F',
        primaryDark: '#0B7F63',
        primaryLight: '#DDF3EB',
        accent: '#FF6B4A',
        coral: '#FF6B4A',
        accentCoral: '#FF6B4A',
        mint: '#DDF3EB',
        nightNavy: '#0A1A2F',
        surface: '#FFFFFF',
        surfaceSubtle: '#EFF6F3',
        border: '#D8E8E1',
        mutedText: '#5A736B'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}

