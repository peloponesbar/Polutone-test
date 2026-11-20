type Env = Record<string, string | undefined>

/**
 * Search engines may index the site only on the real production deployment:
 * a password-protected test site or a Vercel preview must stay out of the index.
 */
export function isIndexable(env: Env = process.env): boolean {
  if (env.SITE_PASSWORD?.trim()) return false
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return false
  return true
}

/** Public pages are listed in the sitemap; everything else is closed in robots.txt. */
export const PRIVATE_PATHS = ['/admin', '/api/', '/cart', '/checkout', '/order/', '/payment/', '/preview']

/** Canonical path for the catalog: only the category filter makes a distinct page; sorting doesn't. */
export function catalogCanonical(category?: string): string {
  return category ? `/catalog?category=${encodeURIComponent(category)}` : '/catalog'
}

/** Plain text for a meta description: one line, cut on a word boundary near 160 characters. */
export function metaDescription(text: string | null | undefined, max = 160): string | undefined {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!flat) return undefined
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—-]+$/, '')}…`
}

type OgInput = { title: string; description?: string; path: string; image?: { url?: string | null; alt?: string | null; width?: number | null; height?: number | null } | null }

/**
 * Open Graph for one page. A page's `openGraph` replaces the layout's as a whole, so it must be
 * complete: title, text, address, and the page's own photo (the layout's default photo otherwise).
 */
export function pageOpenGraph({ title, description, path, image }: OgInput) {
  return {
    type: 'website' as const,
    locale: 'ru_RU',
    siteName: 'POLUTONE',
    title,
    description,
    url: path,
    ...(image?.url
      ? { images: [{ url: image.url, alt: image.alt ?? title, width: image.width ?? undefined, height: image.height ?? undefined }] }
      : {}),
  }
}

/** The site-wide link-preview photo from «Настройки сайта», in the shape `pageOpenGraph` takes. */
export const settingsOgImage = (image: { url?: string | null; alt?: string | null; width?: number | null; height?: number | null } | null) =>
  image?.url ? { url: image.url, alt: image.alt, width: image.width, height: image.height } : null
