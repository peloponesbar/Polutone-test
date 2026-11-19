import { describe, expect, it } from 'vitest'

import { hasCloudStorage, storageKind, storagePlugins } from '@/lib/storage'

const S3 = {
  S3_BUCKET: 'bucket',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  S3_PUBLIC_URL: 'https://s3.example/bucket',
  S3_ENDPOINT: 'https://s3.example',
  S3_REGION: 'ru-1',
}
const BLOB = { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_x' }

describe('storage choice', () => {
  it('keeps uploads on the local disk without cloud settings', () => {
    expect(storageKind({})).toBe('local')
    expect(storageKind({ BLOB_READ_WRITE_TOKEN: '  ' })).toBe('local')
    expect(storagePlugins({})).toEqual([])
    expect(hasCloudStorage({})).toBe(false)
  })

  it('uses Vercel Blob when only its token is set (the Vercel test site)', () => {
    expect(storageKind(BLOB)).toBe('blob')
    expect(storagePlugins(BLOB)).toHaveLength(1)
    expect(hasCloudStorage(BLOB)).toBe(true)
  })

  it('prefers Timeweb S3 when both are set: production data stays in Russia', () => {
    expect(storageKind({ ...S3, ...BLOB })).toBe('s3')
    expect(storagePlugins({ ...S3, ...BLOB })).toHaveLength(1)
  })
})
