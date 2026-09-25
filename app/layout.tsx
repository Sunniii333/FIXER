import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai } from 'next/font/google'
import './globals.css'

const plex = IBM_Plex_Sans_Thai({ weight: ['400', '500', '700'], subsets: ['thai', 'latin'], variable: '--font-thai', display: 'swap' })

export const metadata: Metadata = {
  title: 'The Fixer',
  description: 'รับงาน ลงมือก้าวแรกใน 5 นาที',
  icons: { icon: '/icon.svg', apple: '/icon-180.png' },
  appleWebApp: { capable: true, title: 'The Fixer', statusBarStyle: 'default' },
}
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={plex.variable}>
      <body>{children}</body>
    </html>
  )
}
