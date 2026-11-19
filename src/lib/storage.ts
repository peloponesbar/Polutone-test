import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import type { Plugin } from 'payload'

import { readS3Settings, s3Plugins } from './s3'

type Env = Record<string, string | undefined>

export type StorageKind = 's3' | 'blob' | 'local'

/**
 * Where uploaded media lives:
 * - `s3` — Timeweb S3 when configured (production, data in Russia);
 * - `blob` — otherwise Vercel Blob when its token is set (the Vercel test site: its disk isn't kept);
 * - `local` — otherwise the `/media` folder (development).
 */
export function storageKind(env: Env): StorageKind {
  if (readS3Settings(env)) return 's3'
  if (env.BLOB_READ_WRITE_TOKEN?.trim()) return 'blob'
  return 'local'
}

/**
 * Storage plugins for `media`. Cloud storage adds two columns (prefix, object key); they are
 * inserted in every environment (`alwaysInsertFields`), so the database schema — and the
 * migrations generated locally — are the same whether storage is on or off.
 */
export function storagePlugins(env: Env): Plugin[] {
  const kind = storageKind(env)
  if (kind === 's3') return s3Plugins(env)
  return [
    vercelBlobStorage({
      enabled: kind === 'blob',
      alwaysInsertFields: true,
      token: env.BLOB_READ_WRITE_TOKEN?.trim() ?? '',
      // Public store: browsers load images straight from Blob, not through the app.
      collections: { media: { prefix: 'media', disablePayloadAccessControl: true } },
    }),
  ]
}

/** True when uploads go to cloud storage that a deployment can serve. */
export const hasCloudStorage = (env: Env) => storageKind(env) !== 'local'
