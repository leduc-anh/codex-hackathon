/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EC',
        surface: '#FBFAF7',
        sand: '#E6DECF',
        line: '#E0D8C9',
        'line-soft': '#D8CFC0',
        ink: '#2B2440',
        muted: '#6B6478',
        faint: '#A89FB0',
        indigo: '#5A4A86',
        'indigo-tint': '#EAE6F0',
        clay: '#C9583C',
        'clay-tint': '#F6DFD7',
        sage: '#4F7A63',
        amber: '#B07D2B',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body: ['Be Vietnam Pro', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: { sm: '4px', md: '8px', lg: '12px', xl: '16px' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        reveal: '0 8px 30px rgba(201,88,60,0.12)',
        signature: '0 8px 30px rgba(90,74,134,0.14)',
      },
    },
  },
}
