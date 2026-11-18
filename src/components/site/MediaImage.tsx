import Image from 'next/image'

import type { Media } from '@/payload-types'

/** The fields a rendered photo needs; small enough to pass to client components. */
export type ImageData = Pick<Media, 'id' | 'url' | 'alt' | 'color'>

/** A media item rendered to fill its (overflow-hidden, fixed-ratio) parent. */
export function MediaImage({
  media,
  sizes,
  priority = false,
  className = '',
}: {
  media: ImageData
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

/** Trims a media doc to what rendering needs. */
export function toImageData(media: Media): ImageData {
  return { id: media.id, url: media.url, alt: media.alt, color: media.color }
}
