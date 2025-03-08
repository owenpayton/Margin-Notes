/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      rotate: {
        '0.5': '0.5deg',
        '-0.5': '-0.5deg',
      },
    },
  },
  plugins: [],
}
