/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        relish: {
          accent: '#E05345',
          accentDark: '#B63C32',
          ink: '#1F1A17',
          inkMuted: '#3B332D',
          paper: '#F8F4EE',
          paperDeep: '#EFE3D6',
          warm: '#E3D6C7',
          linen: '#D7C6B2',
          clay: '#BCA892',
          smoke: '#9A8C7E',
          moss: '#5C5A4F',
          sage: '#6F6A5B',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['"Source Sans 3"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'relish-card': '0 25px 65px rgba(31, 26, 23, 0.08)',
      },
      backgroundImage: {
        'paper-fibers': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(232,225,215,0.9) 60%, rgba(217,205,191,0.95) 100%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.35), transparent 35%)',
      },
    },
  },
  plugins: [],
}
