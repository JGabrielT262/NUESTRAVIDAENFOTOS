/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        romantic: {
          50: '#fff5f7',
          100: '#ffeef2',
          200: '#ffd9e4',
          300: '#ffb3c8',
          400: '#ff7da3',
          500: '#f84a7e',
          600: '#e6225d',
          700: '#c2164a',
          800: '#a11540',
          900: '#861639',
        },
      },
    },
  },
  plugins: [],
}
