// Pure helpers for «Настройки сайта»: turn what an admin typed into safe links and lines.
// No Payload imports, so the admin field validators and unit tests can use them directly.
import { EMAIL_PATTERN, formatPhone } from '../orders/checkout'

/** Values used until the settings are first saved in the admin (and as the admin form defaults). */
export const SETTINGS_DEFAULTS = {
  announcement: { enabled: true, text: 'Первая коллекция в разработке', link: '' },
  footer: { tagline: 'Выразительность в полутоне.' },
  seo: {
    title: 'POLUTONE — Выразительность в полутоне',
    description: 'POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.',
  },
} as const

export type ContactsInput = {
  telegram?: string | null
  vk?: string | null
  avito?: string | null
  email?: string | null
  phone?: string | null
}

export type LegalInput = {
  seller?: string | null
  inn?: string | null
  ogrn?: string | null
  address?: string | null
}

export type ContactKind = 'telegram' | 'vk' | 'avito' | 'email' | 'phone'

export type ContactLink = {
  kind: ContactKind
  /** Channel name: «Telegram», «Почта»… */
  label: string
  /** What the visitor reads: «@polutone», «+7 900 123-45-67»… */
  text: string
  href: string
  /** Opens another site (new tab). */
  external: boolean
}

const clean = (value?: string | null) => (value ?? '').trim()

/** Only site paths ("/catalog") and http(s) links; anything else (javascript:, data:…) is dropped. */
export function safeHref(value?: string | null): string | null {
  const v = clean(value)
  if (!v) return null
  if (v.startsWith('/') && !v.startsWith('//')) return v
  if (/^https?:\/\/[^\s/]+\.[^\s]*$/i.test(v)) return v
  return null
}

/** «@polutone», «polutone», «t.me/polutone» or a t.me invite link → Telegram link. */
export function telegramLink(value?: string | null): Pick<ContactLink, 'href' | 'text'> | null {
  const v = clean(value)
  if (!v) return null
  const url = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([^\s?#]+?)\/?$/i.exec(v)
  const path = url ? url[1] : v.replace(/^@/, '')
  if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(path)) return { href: `https://t.me/${path}`, text: `@${path}` }
  if (url && /^\+[A-Za-z0-9_-]+$/.test(path)) return { href: `https://t.me/${path}`, text: 'Telegram' }
  return null
}

/** «polutone», «vk.com/polutone» or a full link → VK link. */
export function vkLink(value?: string | null): Pick<ContactLink, 'href' | 'text'> | null {
  const v = clean(value)
  if (!v) return null
  const url = /^(?:https?:\/\/)?(?:m\.)?vk\.(?:com|ru)\/([A-Za-z0-9_.]+?)\/?$/i.exec(v)
  const handle = url ? url[1] : v.replace(/^@/, '')
  if (!/^[A-Za-z0-9_.]{2,64}$/.test(handle)) return null
  return { href: `https://vk.com/${handle}`, text: `vk.com/${handle}` }
}

/** A full link to the shop's Avito profile. */
export function avitoLink(value?: string | null): Pick<ContactLink, 'href' | 'text'> | null {
  const v = clean(value)
  if (!/^https:\/\/(?:www\.|m\.)?avito\.ru\/\S+$/i.test(v)) return null
  return { href: v, text: 'Магазин на Авито' }
}

export function emailLink(value?: string | null): Pick<ContactLink, 'href' | 'text'> | null {
  const v = clean(value)
  if (!EMAIL_PATTERN.test(v) || v.length > 200) return null
  return { href: `mailto:${v}`, text: v }
}

/** Any Russian number (mobile, landline, 8-800) → +7XXXXXXXXXX; null if it isn't one. */
export function normalizeShopPhone(value?: string | null): string | null {
  const digits = clean(value).replace(/\D/g, '')
  if (digits.length === 10) return `+7${digits}`
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return `+7${digits.slice(1)}`
  return null
}

export function phoneLink(value?: string | null): Pick<ContactLink, 'href' | 'text'> | null {
  const phone = normalizeShopPhone(value)
  return phone ? { href: `tel:${phone}`, text: formatPhone(phone) } : null
}

const CHANNELS: { kind: ContactKind; label: string; build: (v?: string | null) => Pick<ContactLink, 'href' | 'text'> | null; external: boolean }[] = [
  { kind: 'telegram', label: 'Telegram', build: telegramLink, external: true },
  { kind: 'vk', label: 'ВКонтакте', build: vkLink, external: true },
  { kind: 'avito', label: 'Авито', build: avitoLink, external: true },
  { kind: 'email', label: 'Почта', build: emailLink, external: false },
  { kind: 'phone', label: 'Телефон', build: phoneLink, external: false },
]

/** Filled-in contacts as links, in a fixed order; empty or invalid ones are skipped. */
export function contactLinks(contacts?: ContactsInput | null): ContactLink[] {
  return CHANNELS.flatMap(({ kind, label, build, external }) => {
    const link = build(contacts?.[kind])
    return link ? [{ kind, label, external, ...link }] : []
  })
}

/** Seller details line for the footer; null until the seller name is filled in. */
export function legalLine(legal?: LegalInput | null): string | null {
  const seller = clean(legal?.seller)
  if (!seller) return null
  const inn = clean(legal?.inn)
  const ogrn = clean(legal?.ogrn)
  return [
    seller,
    inn && `ИНН ${inn}`,
    ogrn && `${ogrn.length === 15 ? 'ОГРНИП' : 'ОГРН'} ${ogrn}`,
    clean(legal?.address),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The bar above the header, or null when it is off or has no text. */
export function announcementOf(
  bar?: { enabled?: boolean | null; text?: string | null; link?: string | null } | null,
): { text: string; href: string | null } | null {
  const text = clean(bar?.text)
  if (!bar?.enabled || !text) return null
  return { text, href: safeHref(bar.link) }
}

// Admin field validators: true or a message in the admin's language.
type Check = (value: unknown) => true | string
const optional =
  (test: (v: string) => boolean, message: string): Check =>
  (value) => {
    const v = typeof value === 'string' ? value.trim() : ''
    return !v || test(v) ? true : message
  }

export const validators = {
  telegram: optional((v) => telegramLink(v) !== null, 'Укажите ник (@polutone) или ссылку t.me/…'),
  vk: optional((v) => vkLink(v) !== null, 'Укажите адрес страницы: polutone или vk.com/polutone'),
  avito: optional((v) => avitoLink(v) !== null, 'Нужна полная ссылка, начиная с https://www.avito.ru/'),
  email: optional((v) => emailLink(v) !== null, 'Проверьте адрес почты.'),
  phone: optional((v) => normalizeShopPhone(v) !== null, 'Нужен российский номер: +7 900 123-45-67 или 8 800 …'),
  inn: optional((v) => /^\d{10}(\d{2})?$/.test(v), 'ИНН — 12 цифр у ИП (10 у организации).'),
  ogrn: optional((v) => /^\d{13}(\d{2})?$/.test(v), 'ОГРНИП — 15 цифр (ОГРН организации — 13).'),
  link: optional((v) => safeHref(v) !== null, 'Ссылка на страницу сайта (/catalog) или полный адрес https://…'),
} satisfies Record<string, Check>
