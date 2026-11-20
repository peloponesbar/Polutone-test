import type { ContactLink } from '@/lib/settings/format'

import { label, textLink } from './ui'

const linkProps = (c: ContactLink) =>
  c.external
    ? { href: c.href, target: '_blank', rel: 'noopener noreferrer', 'data-contact': c.kind }
    : { href: c.href, 'data-contact': c.kind }

/** Socials read best by their name; mail and phone by the address itself. */
const shortText = (c: ContactLink) => (c.external ? c.label : c.text)

/** Footer column «Связь»: one link per line, on the graphite background. */
export function FooterContacts({ contacts, hours, linkClass }: { contacts: ContactLink[]; hours: string | null; linkClass: string }) {
  return (
    <>
      {contacts.map((c) => (
        <a key={c.kind} {...linkProps(c)} className={linkClass}>
          {shortText(c)}
        </a>
      ))}
      {hours ? <p className="mt-2 font-sans text-caption tracking-body text-background/70">{hours}</p> : null}
    </>
  )
}

/** Contacts as «channel — address» rows (contacts page, order page). */
export function ContactRows({ contacts, hours }: { contacts: ContactLink[]; hours: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col border-t border-primary/10 font-sans text-body-m tracking-body text-primary md:text-body">
        {contacts.map((c) => (
          <div key={c.kind} className="flex flex-col gap-1 border-b border-primary/10 py-3 md:flex-row md:items-baseline md:gap-6">
            <dt className={`${label} text-primary/70 md:w-40 md:shrink-0`}>{c.label}</dt>
            <dd>
              <a {...linkProps(c)} className={textLink}>
                {c.text}
              </a>
            </dd>
          </div>
        ))}
      </dl>
      {hours ? <p className="font-sans text-caption tracking-body text-primary/80">{hours}</p> : null}
    </div>
  )
}
