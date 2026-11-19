import { pluralize } from '@/lib/plural'

/** "3 товара". */
export const itemsLabel = (n: number) => `${n} ${pluralize(n, ['товар', 'товара', 'товаров'])}`

/** Product page in the color that was bought. */
export const productHref = ({ slug, color }: { slug: string; color?: string | null }) =>
  `/catalog/${slug}${color ? `?color=${encodeURIComponent(color)}` : ''}`
