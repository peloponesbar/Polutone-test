import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Docker build on Timeweb sets NEXT_OUTPUT=standalone (small image). Vercel leaves it unset.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
  images: {
    remotePatterns: [
      // Test site on Vercel: photos are served straight from Vercel Blob.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Production: photos are served straight from the Timeweb Cloud S3 bucket.
      { protocol: 'https', hostname: 's3.twcstorage.ru' },
      { protocol: 'https', hostname: '*.twcstorage.ru' },
    ],
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
