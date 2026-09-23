import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Fixer',
  description: 'รับงาน ลงมือก้าวแรกใน 5 นาที',
  icons: { icon: '/icon.svg', apple: '/icon-180.png' },
  appleWebApp: { capable: true, title: 'The Fixer', statusBarStyle: 'default' },
}
export const viewport: Viewport = { themeColor: '#ff7a1a', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
