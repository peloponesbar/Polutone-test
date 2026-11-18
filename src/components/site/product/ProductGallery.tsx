import { MediaImage, type ImageData } from '../MediaImage'
import { PlaceholderArt } from '../PlaceholderArt'

/** First image full width, the rest in pairs (mockup/product.html). Placeholders until photos exist. */
export function ProductGallery({ images, seed }: { images: ImageData[]; seed: number }) {
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

  // The first photo is wide; the rest go in pairs, and a leftover last photo is wide too (no gaps).
  const isWide = (i: number) => i === 0 || (i === images.length - 1 && (images.length - 1) % 2 === 1)

  return (
    <ul aria-label="Фотографии изделия" className="grid grid-cols-2 gap-4 md:gap-6">
      {images.map((image, i) => (
        <li
          key={image.id}
          className={`relative aspect-[4/5] overflow-hidden bg-surface ${isWide(i) ? 'col-span-2' : ''}`}
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
