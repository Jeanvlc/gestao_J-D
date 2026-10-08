// Ícones simples em SVG (sem biblioteca). Herdam a cor do texto.
const base = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const IconeBomba = () => (
  <svg {...base}><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M7 8h4" /><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /></svg>
)
export const IconeTanque = () => (
  <svg {...base}><rect x="3" y="7" width="18" height="11" rx="5" /><path d="M7 18v2M17 18v2M12 7V4M9 12h6" /></svg>
)
export const IconeLista = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const IconeBusca = () => (
  <svg {...base} width={22} height={22}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const IconeFechar = () => (
  <svg {...base} width={22} height={22}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IconeSeta = () => (
  <svg {...base} width={22} height={22}><path d="m6 9 6 6 6-6" /></svg>
)
