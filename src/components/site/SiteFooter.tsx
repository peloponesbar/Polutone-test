import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'
import { listInfoLinks } from '@/lib/info'

import { container, label } from './ui'

const footerLink =
  'inline-flex min-h-[44px] items-center font-sans text-caption tracking-body text-background underline-offset-4 hover:underline hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background'

export async function SiteFooter() {
  const infoLinks = await listInfoLinks()

  return (
    <footer className="border-t border-background/10 bg-primary text-background">
      <div className={`${container} py-16`}>
        <div className="grid grid-cols-4 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-4 flex flex-col gap-4 md:col-span-3">
            {/* Two-tone on dark (sage_dark), 180 px — the brandbook minimum for the two-tone logo. */}
            <Link href="/" aria-label="POLUTONE — на главную" className="inline-flex min-h-[44px] items-center self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background">
              <Logo width={180} tone="dark" />
            </Link>
            <p className="font-sans text-caption tracking-body text-background/70">
              Выразительность в полутоне.
            </p>
          </div>
          <nav aria-label="Магазин" className="col-span-4 flex flex-col md:col-span-2 md:col-start-5">
            <span className={`${label} mb-2 text-background/70`}>Магазин</span>
            <Link href="/catalog" className={footerLink}>
              Каталог
            </Link>
            <Link href="/blog" className={footerLink}>
              Блог
            </Link>
          </nav>
          <nav aria-label="Информация (подвал)" className="col-span-4 flex flex-col md:col-span-3 md:col-start-7">
            <span className={`${label} mb-2 text-background/70`}>Информация</span>
            {infoLinks.map((link) => (
              <Link key={link.href} href={link.href} className={footerLink}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-16 border-t border-background/10 pt-6">
          <p className="font-sans text-caption tracking-body text-background/70">© 2026 POLUTONE</p>
        </div>
      </div>
    </footer>
  )
}
