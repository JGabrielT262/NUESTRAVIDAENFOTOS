import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  themeColor: '#f84a7e',
}

export const metadata = {
  title: 'Nuestra Vida Juntos ❤️',
  description: 'Un lugar especial para nuestros recuerdos',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nuestra Vida Juntos ❤️',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
