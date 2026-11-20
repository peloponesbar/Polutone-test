import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Media, SiteSetting } from '@/payload-types'

import { announcementOf, contactLinks, legalLine, SETTINGS_DEFAULTS, type ContactLink } from './format'

export type SiteSettingsView = {
  contacts: ContactLink[]
  hours: string | null
  legal: string | null
  announcement: { text: string; href: string | null } | null
  tagline: string | null
  seo: { title: string; description: string; image: Media | null }
}

const orNull = (v?: string | null) => (v ?? '').trim() || null

/**
 * Turns the stored global into what the site shows. Before the first save in the admin
 * (no `updatedAt`) the defaults apply; after it, the admin's values — including cleared
 * fields — are used as they are, except the SEO title and description, which never go blank.
 */
export function resolveSettings(doc: Partial<SiteSetting> | null | undefined): SiteSettingsView {
  const saved = Boolean(doc?.updatedAt)
  const D = SETTINGS_DEFAULTS
  const image = doc?.seo?.image
  return {
    contacts: contactLinks(doc?.contacts),
    hours: orNull(doc?.contacts?.hours),
    legal: legalLine(doc?.legal),
    announcement: announcementOf(saved ? doc?.announcement : D.announcement),
    tagline: saved ? orNull(doc?.footer?.tagline) : D.footer.tagline,
    seo: {
      title: orNull(doc?.seo?.title) ?? D.seo.title,
      description: orNull(doc?.seo?.description) ?? D.seo.description,
      image: image && typeof image === 'object' ? image : null,
    },
  }
}

/** Site settings for the current request (header, footer and metadata share one query). */
export const getSiteSettings = cache(async (): Promise<SiteSettingsView> => {
  try {
    const payload = await getPayload({ config })
    return resolveSettings(await payload.findGlobal({ slug: 'site-settings', depth: 1 }))
  } catch (error) {
    // The settings only decorate the page: show the defaults rather than an error page.
    console.error('Site settings could not be loaded; using defaults.', error)
    return resolveSettings(null)
  }
})
