/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A5F',
          900: '#1E3A8A',
        },
        risk: {
          low: '#10B981',
          'low-bg': '#D1FAE5',
          medium: '#F59E0B',
          'medium-bg': '#FEF3C7',
          high: '#F97316',
          'high-bg': '#FFEDD5',
          extreme: '#EF4444',
          'extreme-bg': '#FEE2E2',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
};
