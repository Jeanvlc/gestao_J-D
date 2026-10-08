import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Semi_Condensed } from 'next/font/google'
import RegistrarSW from './registrar-sw'

// next/font embute os arquivos no build: a fonte funciona offline
const texto = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--fonte-texto' })
const display = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--fonte-display' })

export const metadata: Metadata = {
  title: 'V. A. Ribas',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'VA Ribas' },
  icons: { apple: '/icon-192.png' },
}
export const viewport: Viewport = { themeColor: '#1E4D3A', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${texto.variable} ${display.variable}`}>
      <body className="font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  )
}
