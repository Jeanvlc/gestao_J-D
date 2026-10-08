import './globals.css'
import type { Metadata, Viewport } from 'next'
import RegistrarSW from './registrar-sw'

export const metadata: Metadata = {
  title: 'V. A. Ribas',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'VA Ribas' },
  icons: { apple: '/icon-192.png' },
}
export const viewport: Viewport = { themeColor: '#15803d', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900">
        {children}
        <RegistrarSW />
      </body>
    </html>
  )
}
