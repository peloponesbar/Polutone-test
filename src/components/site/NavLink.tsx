'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { navLink } from './ui'

/** Header link: muted, sage underline on hover; graphite with underline on the current section. */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${navLink} ${active ? 'text-primary' : 'text-primary/70 hover:text-primary'}`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute bottom-2 left-0 h-[2px] w-full origin-left bg-accent transition-transform duration-300 ease-out ${
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
      />
    </Link>
  )
}
