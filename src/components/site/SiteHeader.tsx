import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'
import { listInfoLinks } from '@/lib/info'
import { getSiteSettings } from '@/lib/settings'

import { CartLink } from './CartLink'
import { DesktopNav, MobileMenu } from './HeaderNav'
import { container, focusRing } from './ui'

export async function SiteHeader() {
  const [infoLinks, { announcement }] = await Promise.all([listInfoLinks(), getSiteSettings()])

  return (
    <div className="sticky top-0 z-20">
      {announcement ? (
        <div className="bg-surface">
          <div className={`${container} flex min-h-9 items-center justify-center py-1 text-center`}>
            {announcement.href ? (
              <Link
                href={announcement.href}
                className={`font-sans text-caption tracking-body text-primary underline-offset-4 hover:underline hover:decoration-accent ${focusRing}`}
              >
                {announcement.text}
              </Link>
            ) : (
              <span className="font-sans text-caption tracking-body">{announcement.text}</span>
            )}
          </div>
        </div>
      ) : null}
      <header className="relative border-b border-primary/10 bg-background/90 backdrop-blur-md">
        <div
          className={`${container} grid h-16 grid-cols-[auto_1fr] items-center md:h-[72px] md:grid-cols-[1fr_auto_1fr]`}
        >
          <DesktopNav links={infoLinks} />
          <Link href="/" aria-label="POLUTONE — на главную" className={`inline-flex min-h-[44px] items-center ${focusRing}`}>
            <Logo width={180} />
          </Link>
          <div className="flex items-center justify-end gap-2">
            <CartLink />
            <MobileMenu links={infoLinks} />
          </div>
        </div>
      </header>
    </div>
  )
}
