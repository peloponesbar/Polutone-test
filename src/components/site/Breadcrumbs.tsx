import Link from 'next/link'

import { focusRing } from './ui'

export type Crumb = { href?: string; label: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигационная цепочка">
      <ol className="flex flex-wrap items-center gap-2 font-sans text-caption tracking-body text-primary/70">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link
                href={item.href}
                className={`inline-flex min-h-[44px] items-center hover:text-primary ${focusRing}`}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="inline-flex min-h-[44px] items-center">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
