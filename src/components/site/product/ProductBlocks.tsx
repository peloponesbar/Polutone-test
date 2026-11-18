import type { Media, Product } from '@/payload-types'

import { asImage, MediaImage } from '../MediaImage'
import { ProductCard } from '../ProductCard'

type Block = NonNullable<Product['blocks']>[number]

const section = 'border-t border-primary/10 py-16 md:py-24'

function Figure({ media, caption, sizes }: { media: Media | null; caption?: string | null; sizes: string }) {
  if (!media) return null
  return (
    <figure className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-[3/2]">
        <MediaImage media={media} sizes={sizes} />
      </div>
      {caption ? (
        <figcaption className="font-sans text-caption tracking-body text-primary/70">{caption}</figcaption>
      ) : null}
    </figure>
  )
}

function asVideo(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' && value.mimeType?.startsWith('video/') ? value : null
}

function renderBlock(block: Block) {
  switch (block.blockType) {
    case 'fullImage':
    case 'measurementsImage':
      return <Figure media={asImage(block.image)} caption={block.caption} sizes="(min-width: 1440px) 1280px, 100vw" />

    case 'imagePair': {
      const images = [asImage(block.left), asImage(block.right)].filter((m): m is Media => m !== null)
      return (
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-[4/5] overflow-hidden bg-surface">
              <MediaImage media={image} sizes="(min-width: 1440px) 640px, 50vw" />
            </div>
          ))}
        </div>
      )
    }

    case 'quote':
      return (
        <p className="max-w-[24ch] font-display text-h1-m text-primary md:text-h1">{block.text}</p>
      )

    case 'text':
      return (
        <div className="flex max-w-[60ch] flex-col gap-6">
          {block.heading ? <h2 className="font-display text-h2-m text-primary md:text-h2">{block.heading}</h2> : null}
          {block.body
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i} className="font-sans text-body-m tracking-body text-primary/80 md:text-body">
                {paragraph}
              </p>
            ))}
        </div>
      )

    case 'video': {
      const video = asVideo(block.video)
      const poster = asImage(block.poster)
      if (!video?.url) return null
      return (
        <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-video">
          {/* No autoplay: the visitor starts it, which also respects reduced motion. */}
          <video
            controls
            muted
            playsInline
            preload="none"
            poster={poster?.url ?? undefined}
            className="h-full w-full object-cover"
          >
            <source src={video.url} type={video.mimeType ?? undefined} />
          </video>
        </div>
      )
    }

    case 'styleWith': {
      const products = (block.products ?? []).filter((p): p is Product => typeof p === 'object')
      if (products.length === 0) return null
      return (
        <div className="flex flex-col gap-10">
          <h2 className="font-display text-h2-m text-primary md:text-h2">{block.heading || 'С чем носить'}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </div>
      )
    }

    default:
      return null
  }
}

/** Editor-chosen blocks below the product's fixed top, in the order set in the admin. */
export function ProductBlocks({ blocks }: { blocks: Product['blocks'] }) {
  if (!blocks?.length) return null
  return (
    <>
      {blocks.map((block) => {
        const content = renderBlock(block)
        return content ? (
          <section key={block.id} className={section}>
            {content}
          </section>
        ) : null
      })}
    </>
  )
}
