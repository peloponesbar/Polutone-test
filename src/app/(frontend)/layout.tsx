import type { Metadata } from 'next'
import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

import { jura, onest } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'POLUTONE — Выразительность в полутоне',
  description: 'POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${jura.variable} ${onest.variable}`}>
      <body className="flex min-h-screen flex-col bg-background text-primary">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
