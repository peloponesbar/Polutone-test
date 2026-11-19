import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Categories } from './collections/Categories'
import { InfoPages } from './collections/InfoPages'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { Home } from './globals/Home'
import { PREVIEW_BREAKPOINTS } from './lib/preview'
import { storagePlugins } from './lib/storage'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable ${name} (see .env.example)`)
  return value
}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '— POLUTONE',
      description: 'Админка POLUTONE',
      // No Payload-branded link previews.
      defaultOGImageType: 'off',
      openGraph: { siteName: 'POLUTONE', title: 'Админка POLUTONE', description: 'Админка POLUTONE' },
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/brand/polutone-o.svg' }],
    },
    // The brand palette is light: milk background, graphite text.
    theme: 'light',
    // Russian 24-hour dates instead of «ноября 19-е 2026, 5:01 ПП».
    dateFormat: 'd MMMM yyyy, HH:mm',
    avatar: { Component: '/components/admin/Avatar#Avatar' },
    components: {
      beforeDashboard: ['/components/admin/Dashboard#Dashboard'],
      afterNavLinks: ['/components/admin/Dashboard#SiteLink'],
      graphics: {
        Logo: '/components/admin/Brand#Logo',
        Icon: '/components/admin/Brand#Icon',
      },
    },
    // Device sizes for Live Preview; the preview URL is set per collection / global.
    livePreview: { breakpoints: PREVIEW_BREAKPOINTS },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: 'ru',
    // Payload's Russian «searchBy» drops the field name: the search box read «Искать по».
    translations: { ru: { general: { searchBy: 'Искать: {{label}}', or: 'или' } } },
  },
  collections: [Products, Categories, Orders, InfoPages, Media, Users],
  globals: [Home],
  editor: lexicalEditor(),
  secret: requireEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: requireEnv('DATABASE_URL'),
    },
  }),
  sharp,
  plugins: [...storagePlugins(process.env)],
})
