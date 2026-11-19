import type { LivePreviewConfig, PayloadRequest, Where } from 'payload'

/** The published version — what visitors see. */
export const PUBLISHED: Where = { _status: { equals: 'published' } }

/**
 * Drafts for admin-edited content: «Опубликовать» puts a version on the site,
 * everything else (autosave while typing) stays a draft visible only in preview.
 */
export const DRAFT_VERSIONS = {
  drafts: { autosave: { interval: 800 } },
  maxPerDoc: 50,
} as const

/** Live Preview device sizes — the same viewports the design is checked at. */
export const PREVIEW_BREAKPOINTS: NonNullable<LivePreviewConfig['breakpoints']> = [
  { name: 'mobile', label: 'Телефон', width: 390, height: 844 },
  { name: 'tablet', label: 'Планшет', width: 768, height: 1024 },
  { name: 'desktop', label: 'Компьютер', width: 1440, height: 900 },
]

export type PreviewTarget = 'products' | 'info-pages' | 'home'

/** Site path that shows a document, or null when it has no page yet (no slug). */
export function previewPathFor(target: PreviewTarget, slug?: unknown): string | null {
  if (target === 'home') return '/'
  if (typeof slug !== 'string' || !slug) return null
  const encoded = encodeURIComponent(slug)
  return target === 'products' ? `/catalog/${encoded}` : `/info/${encoded}`
}

/** Only same-site paths: blocks open redirects such as `//evil.example` or `/\evil.example`. */
export function isSafePath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}

/** Origin the admin was opened on, so preview works locally, on Vercel and on the final host. */
function requestOrigin(req: PayloadRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Address of the route that switches the browser into draft mode and opens `path`. */
export function previewUrl(req: PayloadRequest, path: string | null): string | null {
  if (!path) return null
  return `${requestOrigin(req)}/preview?path=${encodeURIComponent(path)}`
}
