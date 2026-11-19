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

export function storagePlugins(env: Env): Plugin[] {
  switch (storageKind(env)) {
    case 's3':
      return s3Plugins(env)
    case 'blob':
      return [
        vercelBlobStorage({
          token: env.BLOB_READ_WRITE_TOKEN!.trim(),
          // Public store: browsers load images straight from Blob, not through the app.
          collections: { media: { prefix: 'media', disablePayloadAccessControl: true } },
        }),
      ]
    default:
      return []
  }
}

/** True when uploads go to cloud storage that a deployment can serve. */
export const hasCloudStorage = (env: Env) => storageKind(env) !== 'local'
