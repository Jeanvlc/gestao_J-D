'use client'
import { useEffect } from 'react'

export default function RegistrarSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').then(async () => {
      const reg = await navigator.serviceWorker.ready
      // na 1ª visita o SW ainda não controlava a página: pede para guardar o que já foi carregado
      const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin + '/_next/static/'))
      reg.active?.postMessage({ guardar: [location.pathname, ...urls] })
    })
  }, [])
  return null
}
