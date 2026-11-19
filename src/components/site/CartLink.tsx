'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { countItems } from '@/lib/cart/cart'
import { useCart } from '@/lib/cart/store'
import { pluralize } from '@/lib/plural'

import { focusRing, hoverInvert, label, navLink } from './ui'

/** Header link to the cart with the item count: a word on desktop, a bag + number on phones. */
export function CartLink() {
  const count = countItems(useCart())
  const on = usePathname() === '/cart'
  const name = count > 0 ? `Корзина, ${count} ${pluralize(count, ['товар', 'товара', 'товаров'])}` : 'Корзина, пусто'

  return (
    <Link href="/cart" aria-label={name} aria-current={on ? 'page' : undefined} className={`group inline-flex ${focusRing}`}>
      {/* Desktop */}
      <span className="hidden md:block">
        <span className={`${navLink} ${on ? 'text-primary' : 'text-primary/70 group-hover:text-primary'}`}>
          Корзина{count > 0 ? ` · ${count}` : ''}
          <span
            aria-hidden="true"
            className={`absolute bottom-2 left-0 h-[2px] w-full origin-left bg-accent transition-transform duration-300 ease-out ${
              on ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`}
          />
        </span>
      </span>
      {/* Phone: the logo needs its 180 px, so a bag icon instead of the word. */}
      <span
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 border border-primary/20 px-2 text-primary md:hidden ${label} ${hoverInvert}`}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 7h12l-1 11H5L4 7z" />
          <path d="M7 7V5a3 3 0 0 1 6 0v2" />
        </svg>
        {count > 0 ? <span aria-hidden="true">{count}</span> : null}
      </span>
    </Link>
  )
}
