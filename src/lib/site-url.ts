type Env = Record<string, string | undefined>

/**
 * The site's public address for links that leave the browser: emails, ЮKassa's return link.
 * SITE_URL on the real domain; on Vercel its production address; locally localhost.
 */
export function siteUrl(env: Env = process.env): string {
  const explicit = env.SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`
  return `http://localhost:${env.PORT?.trim() || '3000'}`
}

export const orderUrl = (token: string, env: Env = process.env) => `${siteUrl(env)}/order/${token}`
