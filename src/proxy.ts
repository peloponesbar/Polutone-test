import { NextResponse, type NextRequest } from 'next/server'

import { isAuthorized, isPasswordFree, SITE_REALM } from './lib/site-password'

/** Closes the whole site with a password when SITE_PASSWORD is set (test deployments). */
export function proxy(request: NextRequest) {
  if (isPasswordFree(request.nextUrl.pathname) || isAuthorized(request.headers.get('authorization'), process.env.SITE_PASSWORD)) {
    return NextResponse.next()
  }
  return new NextResponse('Требуется пароль', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${SITE_REALM}", charset="UTF-8"` },
  })
}

export const config = {
  // Everything except Next's own static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
