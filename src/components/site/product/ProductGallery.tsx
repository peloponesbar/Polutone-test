import type { Media } from '@/payload-types'

import { MediaImage } from '../MediaImage'
import { PlaceholderArt } from '../PlaceholderArt'

/** First image full width, the rest in pairs (mockup/product.html). Placeholders until photos exist. */
export function ProductGallery({ images, seed }: { images: Media[]; seed: number }) {
  if (images.length === 0) {
    return (
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`relative aspect-[4/5] overflow-hidden bg-surface ${i === 0 ? 'col-span-2' : ''}`}
          >
            <PlaceholderArt seed={seed + i} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul aria-label="Фотографии изделия" className="grid grid-cols-2 gap-4 md:gap-6">
      {images.map((image, i) => (
        <li
          key={image.id}
          className={`relative aspect-[4/5] overflow-hidden bg-surface ${i === 0 ? 'col-span-2' : ''}`}
        >
          <MediaImage
            media={image}
            priority={i === 0}
            sizes={i === 0 ? '(min-width: 768px) 55vw, 100vw' : '(min-width: 768px) 27vw, 50vw'}
          />
        </li>
      ))}
    </ul>
  )
}
