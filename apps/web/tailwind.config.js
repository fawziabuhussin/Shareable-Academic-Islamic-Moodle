/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zad Al-Hidaya Color Palette
        primary: {
          DEFAULT: '#1a5f4a',  // Deep forest green
          dark: '#134436',
          light: '#2d8a6e',
          50: '#f0fdf4',
          100: '#dcfce7',
        },
        gold: {
          DEFAULT: '#c9a227',  // Rich gold
          dark: '#a68521',
          light: '#e3c65c',
          muted: '#d4b94e',
        },
        olive: {
          DEFAULT: '#5c6b4c',  // Olive - nature, peace
          dark: '#4a5740',
          light: '#7a8c66',
        },
        earth: {
          DEFAULT: '#8b7355',  // Earth brown
          light: '#a69076',
          dark: '#6b5a44',
        },
        // Semantic
        success: '#2d8a6e',
        danger: '#b91c1c',
        warning: '#c9a227',
      },
      fontFamily: {
        arabic: ['var(--font-cairo)', 'var(--font-noto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}




