'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import type { InfoLink } from '@/lib/info'

import { focusRing, hoverInvert, label, navLink } from './ui'

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

function Underline({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-2 left-0 h-[2px] w-full origin-left bg-accent transition-transform duration-300 ease-out ${
        on ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
      }`}
    />
  )
}

function TopLink({ href, children }: { href: string; children: React.ReactNode }) {
  const on = isActive(usePathname(), href)
  return (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={`${navLink} ${on ? 'text-primary' : 'text-primary/70 hover:text-primary'}`}
    >
      {children}
      <Underline on={on} />
    </Link>
  )
}

/** Closes a popup on Escape, on a click outside `ref`, and on navigation. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname()
  useEffect(close, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps -- close on route change only

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, close, ref])
}

/** Desktop «Информация» dropdown: opens on click or Enter/Space (not hover — hover + click would fight). */
function InfoDropdown({ links }: { links: InfoLink[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const on = isActive(usePathname(), '/info')
  useDismiss(open, () => setOpen(false), ref)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`${navLink} gap-2 ${on || open ? 'text-primary' : 'text-primary/70 hover:text-primary'}`}
      >
        Информация
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4" />
        </svg>
        <Underline on={on} />
      </button>
      <div id={menuId} hidden={!open} className="absolute top-full left-0 z-30 pt-2">
        <ul className="min-w-64 border border-primary/10 bg-background py-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex min-h-[44px] items-center px-4 font-sans text-caption tracking-body text-primary/80 hover:bg-surface/40 hover:text-primary ${focusRing}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Phone menu: «Меню» button opening a panel under the header. */
function MobileMenu({ links }: { links: InfoLink[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()
  useDismiss(open, () => setOpen(false), ref)

  const item = `-mx-2 flex min-h-[44px] items-center px-2 font-sans text-body-m tracking-body text-primary transition-colors duration-300 hover:bg-surface/40 ${focusRing}`

  return (
    <div ref={ref} className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[44px] items-center border border-primary/20 px-4 ${label} text-primary ${hoverInvert} ${focusRing}`}
      >
        {open ? 'Закрыть' : 'Меню'}
      </button>
      <nav
        id={panelId}
        hidden={!open}
        aria-label="Меню"
        className="absolute inset-x-0 top-full border-b border-primary/10 bg-background px-6 pt-2 pb-6"
      >
        <ul className="flex flex-col">
          <li className="border-b border-primary/10">
            <Link href="/catalog" className={item}>Каталог</Link>
          </li>
          <li className="border-b border-primary/10 py-2">
            <Link href="/info" className={`${item} ${label}`}>Информация</Link>
            <ul className="flex flex-col pl-4">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={`${item} text-primary/80`}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <Link href="/blog" className={item}>Блог</Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export function DesktopNav({ links }: { links: InfoLink[] }) {
  return (
    <nav aria-label="Основная навигация" className="hidden items-center gap-8 md:flex">
      <TopLink href="/catalog">Каталог</TopLink>
      <InfoDropdown links={links} />
      <TopLink href="/blog">Блог</TopLink>
    </nav>
  )
}

export { MobileMenu }
