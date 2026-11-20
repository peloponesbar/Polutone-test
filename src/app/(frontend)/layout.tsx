import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import React from 'react'

import { PreviewBar } from '@/components/site/PreviewBar'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { isIndexable } from '@/lib/seo'
import { getSiteSettings } from '@/lib/settings'
import { siteUrl } from '@/lib/site-url'

import { jura, onest } from './fonts'
import './globals.css'

/** Site name, description and link preview from «Настройки сайта»; pages override the title. */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteSettings()
  const image = seo.image?.url
    ? [{ url: seo.image.url, width: seo.image.width ?? undefined, height: seo.image.height ?? undefined, alt: seo.image.alt ?? '' }]
    : undefined
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.title, template: '%s — POLUTONE' },
    description: seo.description,
    robots: isIndexable() ? undefined : { index: false, follow: false },
    openGraph: { type: 'website', locale: 'ru_RU', siteName: 'POLUTONE', title: seo.title, description: seo.description, images: image },
  }
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
