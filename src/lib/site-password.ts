/**
 * Optional password for the whole site (test deployments): set SITE_PASSWORD to enable.
 * Uses HTTP Basic auth — the browser asks once; any user name works.
 */
export const SITE_REALM = 'POLUTONE test'

/** Constant-time string comparison, so response timing doesn't leak the password. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

/** True when the request may pass: no password configured, or the Basic auth password matches. */
export function isAuthorized(authorization: string | null, password: string | undefined): boolean {
  if (!password) return true
  if (!authorization?.startsWith('Basic ')) return false
  let decoded: string
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(authorization.slice(6)), (c) => c.charCodeAt(0)))
  } catch {
    return false
  }
  const separator = decoded.indexOf(':')
  if (separator === -1) return false
  return safeEqual(decoded.slice(separator + 1), password)
}
