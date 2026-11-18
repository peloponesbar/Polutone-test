import { describe, expect, it } from 'vitest'

import { buildPublicFileUrl, readS3Settings, s3Plugins } from '@/lib/s3'

const FULL = {
  S3_ENDPOINT: 'https://s3.twcstorage.ru',
  S3_REGION: 'ru-1',
  S3_BUCKET: 'polutone',
  S3_ACCESS_KEY: 'test-access',
  S3_SECRET_KEY: 'test-secret',
  S3_PUBLIC_URL: 'https://s3.twcstorage.ru/polutone/',
}

describe('readS3Settings', () => {
  it('returns null when nothing is set', () => {
    expect(readS3Settings({})).toBeNull()
  })

  it('returns null when only the .env.example defaults are set', () => {
    expect(
      readS3Settings({ S3_ENDPOINT: FULL.S3_ENDPOINT, S3_REGION: FULL.S3_REGION, S3_BUCKET: '' }),
    ).toBeNull()
  })

  it('returns settings and trims the trailing slash of the public URL', () => {
    expect(readS3Settings(FULL)).toEqual({
      endpoint: 'https://s3.twcstorage.ru',
      region: 'ru-1',
      bucket: 'polutone',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret',
      publicUrl: 'https://s3.twcstorage.ru/polutone',
    })
  })

  it('treats whitespace-only values as missing', () => {
    expect(() => readS3Settings({ ...FULL, S3_SECRET_KEY: '   ' })).toThrow('S3_SECRET_KEY')
  })

  it('throws naming every missing variable when partially configured', () => {
    expect(() => readS3Settings({ S3_BUCKET: 'polutone' })).toThrow(
      'S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL',
    )
  })
})

describe('buildPublicFileUrl', () => {
  it('joins base, prefix and filename', () => {
    expect(buildPublicFileUrl('https://cdn.test/b', 'shirt.webp', 'media')).toBe(
      'https://cdn.test/b/media/shirt.webp',
    )
  })

  it('handles missing prefix and stray slashes', () => {
    expect(buildPublicFileUrl('https://cdn.test/b/', 'a.jpg')).toBe('https://cdn.test/b/a.jpg')
    expect(buildPublicFileUrl('https://cdn.test/b', 'a.jpg', '/media/')).toBe(
      'https://cdn.test/b/media/a.jpg',
    )
  })
})

describe('s3Plugins', () => {
  it('adds no plugin when S3 is not configured', () => {
    expect(s3Plugins({})).toEqual([])
  })

  it('adds the storage plugin when configured', () => {
    expect(s3Plugins(FULL)).toHaveLength(1)
  })
})
