import Link from 'next/link'

import { label, textLink } from './ui'

/** "01 / Каталог" label + heading, optional link on the right (DESIGN_SYSTEM.md → Section Header). */
export function SectionHeader({
  index,
  eyebrow,
  title,
  id,
  link,
}: {
  index: string
  eyebrow: string
  title: string
  id: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-4">
        <span className={`${label} text-primary/70`}>
          {index} / {eyebrow}
        </span>
        <h2 id={id} className="font-display text-h2-m text-primary md:text-h2">
          {title}
        </h2>
      </div>
      {link ? (
        <Link href={link.href} className={`self-start font-sans text-caption tracking-body md:self-auto ${textLink}`}>
          {link.label}
        </Link>
      ) : null}
    </div>
  )
}
