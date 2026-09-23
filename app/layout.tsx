import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'The Fixer', description: 'รับงาน ลงมือใน 5 นาที' }
export const viewport: Viewport = { themeColor: '#ff7a1a', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
