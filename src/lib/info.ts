import config from '@payload-config'
import { getPayload } from 'payload'

import type { InfoPage } from '@/payload-types'

export type InfoLink = { href: string; label: string }

const publicPages = { published: { equals: true } } as const

/** Menu items of «Информация», in admin order. */
export async function listInfoLinks(): Promise<InfoLink[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'info-pages',
    where: publicPages,
    sort: ['menuOrder', 'title'],
    limit: 50,
    depth: 0,
    select: { title: true, slug: true },
  })
  return result.docs.map((page) => ({ href: `/info/${page.slug}`, label: page.title }))
}

export async function getInfoPage(slug: string): Promise<InfoPage | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'info-pages',
    where: { and: [publicPages, { slug: { equals: slug } }] },
    limit: 1,
    depth: 0,
  })
  return result.docs[0] ?? null
}

/** Splits admin text into paragraphs on blank lines. */
export function paragraphs(text?: string | null): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
