'use client'

import { useAuth } from '@payloadcms/ui'

/** Account button picture: the admin's initial, milk on graphite (replaces Payload's logo avatar). */
export function Avatar() {
  const { user } = useAuth()
  const initial = (user?.email?.trim()[0] ?? '·').toUpperCase()
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'var(--theme-elevation-1000)',
        color: 'var(--theme-elevation-0)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {initial}
    </span>
  )
}
