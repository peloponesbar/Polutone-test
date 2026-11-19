import Image from 'next/image'
import Link from 'next/link'

import type { PricedLine } from '@/lib/cart/cart'

import { productHref } from './format'

/**
 * Product photo of a cart line in the color that was chosen, 4:5, linking to the product.
 * Hidden from screen readers and the tab order: the title next to it is the real link.
 * Fills the width of its grid column; `sizes` is that width for the image optimizer.
 */
export function LineThumb({ line, sizes }: { line: PricedLine; sizes: string }) {
  const sold = line.status === 'unavailable'
  return (
    <Link
      href={productHref(line)}
      tabIndex={-1}
      aria-hidden="true"
      className="relative block aspect-[4/5] w-full overflow-hidden bg-surface"
    >
      {line.image ? (
        <Image
          src={line.image.url}
          alt=""
          fill
          sizes={sizes}
          className={`object-cover ${sold ? 'opacity-40' : ''}`}
        />
      ) : null}
    </Link>
  )
}
