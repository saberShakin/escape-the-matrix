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
        matrix: {
          void: '#050811',
          base: '#0A0E17',
          surface: '#121824',
          panel: '#1A2233',
          border: '#2A364F',
          cyan: '#00F0FF',
          green: '#00FF66',
          magenta: '#FF007F',
          amber: '#FFB000',
          purple: '#9D00FF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-green': '0 0 15px rgba(0, 255, 102, 0.4)',
        'neon-magenta': '0 0 15px rgba(255, 0, 127, 0.4)',
        'neon-amber': '0 0 15px rgba(255, 176, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
