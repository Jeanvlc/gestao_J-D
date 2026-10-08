import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mata: { DEFAULT: '#1E4D3A', escuro: '#143628', claro: '#E2EBE5' },
        diesel: { DEFAULT: '#F2B100', escuro: '#B88600', claro: '#FFF3CC' },
        fundo: '#EDEFEB',
        tinta: '#17201B',
        alerta: { DEFAULT: '#B3261E', claro: '#FBE4E2' },
      },
      fontFamily: {
        sans: ['var(--fonte-texto)', 'system-ui', 'sans-serif'],
        display: ['var(--fonte-display)', 'var(--fonte-texto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
