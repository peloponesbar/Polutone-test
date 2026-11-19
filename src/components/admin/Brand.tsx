import { Logo as BrandLogo } from '@/components/brand/Logo'

/** Full POLUTONE logo on the admin login screen; the O halves fade on hover, as on the site. */
export function Logo() {
  return <BrandLogo width={240} title="POLUTONE" />
}

/** Small admin icon (nav, breadcrumbs): the half-tone O, with the same hover effect. */
export function Icon() {
  return <BrandLogo variant="mark" width={24} title="POLUTONE" />
}
