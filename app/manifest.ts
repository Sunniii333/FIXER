import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Fixer',
    short_name: 'Fixer',
    description: 'รับงาน ลงมือก้าวแรกใน 5 นาที',
    lang: 'th',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3e6d0',
    theme_color: '#ff7a1a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
