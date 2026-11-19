import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import { PUBLISHED } from '@/lib/preview'
import type { InfoPage } from '@/payload-types'

export type InfoLink = { href: string; label: string }

/** Menu items of «Информация», in admin order. */
export async function listInfoLinks(): Promise<InfoLink[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'info-pages',
    where: PUBLISHED,
    sort: ['menuOrder', 'title'],
    limit: 50,
    depth: 0,
    select: { title: true, slug: true },
  })
  return result.docs.map((page) => ({ href: `/info/${page.slug}`, label: page.title }))
}

/** Published page by slug; in draft mode (admin preview) the latest draft of any page. */
export async function getInfoPage(slug: string, { draft = false } = {}): Promise<InfoPage | null> {
  const payload = await getPayload({ config })
  const bySlug: Where = { slug: { equals: slug } }
  const result = await payload.find({
    collection: 'info-pages',
    where: draft ? bySlug : { and: [PUBLISHED, bySlug] },
    draft,
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
