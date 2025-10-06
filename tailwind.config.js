/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6fffe',
          100: '#ccfffe',
          200: '#99fffd',
          300: '#66fffc',
          400: '#33fffb',
          500: '#00ccc9',
          600: '#00b3b0',
          700: '#009997',
          800: '#00807e',
          900: '#006665',
        },
      },
    },
  },
  plugins: [],
};
