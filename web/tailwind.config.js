/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        science: '#3B82F6',
        history: '#F59E0B',
        technology: '#8B5CF6',
        philosophy: '#EC4899',
        arts: '#10B981',
        nature: '#06B6D4',
      },
    },
  },
  plugins: [],
};
