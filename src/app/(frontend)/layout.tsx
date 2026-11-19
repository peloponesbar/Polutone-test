import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import React from 'react'

import { PreviewBar } from '@/components/site/PreviewBar'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

import { jura, onest } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'POLUTONE — Выразительность в полутоне',
  description: 'POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preview = (await draftMode()).isEnabled
  return (
    <html lang="ru" className={`${jura.variable} ${onest.variable}`}>
      <body className="flex min-h-screen flex-col bg-background text-primary">
        {preview ? <PreviewBar /> : null}
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
