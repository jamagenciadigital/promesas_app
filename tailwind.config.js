/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'club-primary': ({ opacityValue }) => {
          if (opacityValue !== undefined) {
            return `color-mix(in srgb, var(--club-primary-color) ${opacityValue * 100}%, transparent)`;
          }
          return 'var(--club-primary-color)';
        }
      }
    },
  },
  plugins: [],
}
