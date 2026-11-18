import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

/** Timeweb Cloud S3 settings read from the environment. */
export type S3Settings = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}

type Env = Record<string, string | undefined>

const REQUIRED = {
  endpoint: 'S3_ENDPOINT',
  region: 'S3_REGION',
  bucket: 'S3_BUCKET',
  accessKeyId: 'S3_ACCESS_KEY',
  secretAccessKey: 'S3_SECRET_KEY',
  publicUrl: 'S3_PUBLIC_URL',
} as const satisfies Record<keyof S3Settings, string>

// Endpoint and region have defaults in .env.example, so they alone don't mean "configured".
const ACCOUNT_SPECIFIC: (keyof S3Settings)[] = ['bucket', 'accessKeyId', 'secretAccessKey', 'publicUrl']

/**
 * Returns S3 settings when configured, or `null` when none of the account-specific
 * variables are set (uploads then fall back to the local `/media` folder in development).
 * A partially filled config is a mistake, so it throws naming the missing variables.
 */
export function readS3Settings(env: Env): S3Settings | null {
  const keys = Object.keys(REQUIRED) as (keyof S3Settings)[]
  const values = Object.fromEntries(
    keys.map((key) => [key, env[REQUIRED[key]]?.trim() ?? '']),
  ) as S3Settings

  if (ACCOUNT_SPECIFIC.every((key) => !values[key])) return null

  const missing = keys.filter((key) => !values[key]).map((key) => REQUIRED[key])
  if (missing.length > 0) {
    throw new Error(`S3 is partially configured. Missing: ${missing.join(', ')}`)
  }

  return { ...values, publicUrl: values.publicUrl.replace(/\/+$/, '') }
}

/** Public URL of a stored file: <publicUrl>/<prefix>/<filename>. */
export function buildPublicFileUrl(publicUrl: string, filename: string, prefix?: string): string {
  const parts = [publicUrl.replace(/\/+$/, ''), prefix?.replace(/^\/+|\/+$/g, ''), filename]
  return parts.filter(Boolean).join('/')
}

/** Payload storage plugin for the `media` collection, or none when S3 isn't configured. */
export function s3Plugins(env: Env): Plugin[] {
  const s3 = readS3Settings(env)
  if (!s3) return []

  return [
    s3Storage({
      alwaysInsertFields: true,
      acl: 'public-read',
      bucket: s3.bucket,
      collections: {
        media: {
          prefix: 'media',
          // Public bucket: browsers load images straight from S3, not through the app.
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) =>
            buildPublicFileUrl(s3.publicUrl, filename, prefix),
        },
      },
      config: {
        endpoint: s3.endpoint,
        region: s3.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        },
      },
    }),
  ]
}
