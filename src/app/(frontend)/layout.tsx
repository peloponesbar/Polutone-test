import type { Metadata } from 'next'
import React from 'react'

import { jura, onest } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'POLUTONE — Выразительность в полутоне',
  description: 'POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${jura.variable} ${onest.variable}`}>
      <body className="min-h-screen bg-background text-primary">{children}</body>
    </html>
  )
}
