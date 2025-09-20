/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00D1FF',
        'accent-blue': '#4BE1FF',
        'dark-bg': '#0b1020',
        'dark-card': '#1a2332',
        'dark-border': '#2d3748',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00D1FF, 0 0 10px #00D1FF, 0 0 15px #00D1FF' },
          '100%': { boxShadow: '0 0 10px #00D1FF, 0 0 20px #00D1FF, 0 0 30px #00D1FF' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .8 },
        },
      },
    },
  },
  plugins: [],
};