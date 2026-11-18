import Image from 'next/image'

import type { Media } from '@/payload-types'

/** A Payload media item rendered to fill its (overflow-hidden, fixed-ratio) parent. */
export function MediaImage({
  media,
  sizes,
  priority = false,
  className = '',
}: {
  media: Media
  sizes: string
  priority?: boolean
  className?: string
}) {
  if (!media.url) return null
  return (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  )
}

/** Narrows a Payload upload relation (id or populated doc) to a populated image. */
export function asImage(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' && value.mimeType?.startsWith('image/') ? value : null
}
