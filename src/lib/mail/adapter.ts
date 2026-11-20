import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

type Env = Record<string, string | undefined>

export type SmtpSettings = { host: string; port: number; user: string; pass: string; from: string; fromName: string }

/** SMTP from .env, or null when not set up (then Payload only logs letters). */
export function readSmtpSettings(env: Env): SmtpSettings | null {
  const host = env.SMTP_HOST?.trim()
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASS?.trim()
  const from = env.MAIL_FROM?.trim()
  if (!host || !user || !pass || !from) return null
  const port = Number(env.SMTP_PORT?.trim() || 465)
  return { host, port: Number.isInteger(port) && port > 0 ? port : 465, user, pass, from, fromName: env.MAIL_FROM_NAME?.trim() || 'POLUTONE' }
}

/** Payload email adapter for any SMTP service (Unisender Go, Яндекс 360, Mail.ru для бизнеса…). */
export function emailAdapter(env: Env) {
  const smtp = readSmtpSettings(env)
  if (!smtp) return undefined
  return nodemailerAdapter({
    defaultFromAddress: smtp.from,
    defaultFromName: smtp.fromName,
    transportOptions: {
      host: smtp.host,
      port: smtp.port,
      // 465 — TLS from the start; 587/25 — STARTTLS.
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    },
  })
}
