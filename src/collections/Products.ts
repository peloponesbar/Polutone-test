import type { CollectionBeforeChangeHook, CollectionConfig, Field, Where } from 'payload'

import { getCatalogSource } from '../lib/catalog/source'
import { CATALOG_SYNC_CONTEXT, syncCatalog } from '../lib/catalog/sync'
import { DRAFT_VERSIONS, previewPathFor, previewUrl } from '../lib/preview'
import { productBlocks } from './productBlocks'

const cell = (name: string, clientProps?: Record<string, string>) => ({
  Cell: { path: `/components/admin/cells#${name}`, clientProps },
})

/** What visitors may see: published and still present in the source. */
export const PUBLIC_PRODUCTS: Where = {
  and: [{ _status: { equals: 'published' } }, { inSource: { equals: true } }],
}

/** Fields owned by the catalog source (MoySklad); only catalog sync writes them. */
export const SOURCE_FIELDS: string[] = []

const fromSource = (field: Field): Field => {
  if ('name' in field) SOURCE_FIELDS.push(field.name)
  return { ...field, admin: { ...('admin' in field ? field.admin : {}), readOnly: true } } as Field
}

/**
 * Admin saves (drafts, publishing, restoring an old version) always carry the current
 * MoySklad data, never a stale copy from an open form or an old version.
 * The main row holds it: catalog sync keeps it fresh even while a draft is pending.
 */
const keepSourceData: CollectionBeforeChangeHook = async ({ context, data, operation, originalDoc, req }) => {
  if (operation !== 'update' || context[CATALOG_SYNC_CONTEXT] || !originalDoc?.id) return data
  const current = await req.payload.db.findOne<{ id: number } & Record<string, unknown>>({
    collection: 'products',
    where: { id: { equals: originalDoc.id } },
    req,
  })
  if (!current) return data
  for (const name of SOURCE_FIELDS) {
    if (name in current) data[name] = current[name]
  }
  return data
}

/**
 * Products: commerce data comes from the catalog source (MoySklad) and is read-only here;
 * presentation (photos, description, page blocks) and publishing are edited in the admin.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Товар', plural: 'Товары' },
  admin: {
    useAsTitle: 'title',
    group: 'Магазин',
    listSearchableFields: ['title', 'article'],
    defaultColumns: ['images', 'title', 'category', 'price', 'inStock', '_status', 'inSource'],
    description:
      'Название, цены, варианты и остатки приходят из МойСклада. Здесь — фото, подача и публикация.',
    components: {
      beforeListTable: ['/components/admin/SyncButton#SyncButton'],
    },
    livePreview: {
      url: ({ data, req }) => previewUrl(req, previewPathFor('products', data?.slug)),
    },
    preview: (doc, { req }) => previewUrl(req, previewPathFor('products', doc.slug)),
  },
  versions: DRAFT_VERSIONS,
  hooks: {
    beforeChange: [keepSourceData],
  },
  access: {
    // Visitors see only published products that still exist in the source.
    read: ({ req }) => (req.user ? true : PUBLIC_PRODUCTS),
    // Products are created and removed only by catalog sync.
    create: () => false,
    delete: () => false,
  },
  endpoints: [
    {
      path: '/sync',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Требуется вход в админку' }, { status: 401 })
        try {
          const report = await syncCatalog(req.payload, getCatalogSource(process.env))
          return Response.json(report)
        } catch (error) {
          req.payload.logger.error({ err: error, msg: 'Catalog sync failed' })
          const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
          return Response.json({ error: `Синхронизация не удалась: ${message}` }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    fromSource({
      name: 'slug',
      label: 'Адрес (slug)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Задаётся один раз, чтобы ссылки не менялись.' },
    }),
    fromSource({
      name: 'inSource',
      label: 'Есть в МойСкладе',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Снят — товар удалён в МойСкладе и скрыт с сайта.',
        components: cell('FlagCell', { yes: 'Есть', no: 'Убран — скрыт' }),
      },
    }),
    fromSource({
      name: 'syncedAt',
      label: 'Синхронизирован',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMMM yyyy, HH:mm' } },
    }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Подача',
          fields: [
            {
              name: 'images',
              label: 'Фото',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              filterOptions: { mimeType: { contains: 'image' } },
              admin: {
                description: 'По порядку показа: первое — в каталоге и первым в галерее. Соотношение 4:5.',
                components: cell('ThumbCell'),
              },
            },
            {
              name: 'description',
              label: 'Короткое описание',
              type: 'textarea',
              maxLength: 240,
              admin: { description: 'Посадка и одна ясная деталь. Без «уникальный», «идеальный».' },
            },
            {
              name: 'modelNote',
              label: 'Про модель',
              type: 'text',
              admin: { placeholder: 'Рост модели — 178 см, на ней размер M.' },
            },
            {
              name: 'blocks',
              label: 'Блоки страницы',
              type: 'blocks',
              labels: { singular: 'блок', plural: 'Блоки' },
              blocks: productBlocks,
              admin: { description: 'Идут под основной частью страницы, в заданном порядке.' },
            },
          ],
        },
        {
          label: 'Данные МойСклада',
          description: 'Только для просмотра: эти поля меняются в МоёмСкладе и приходят при синхронизации.',
          fields: [
            fromSource({ name: 'title', label: 'Название', type: 'text', required: true }),
            fromSource({ name: 'article', label: 'Артикул', type: 'text' }),
            fromSource({
              name: 'category',
              label: 'Категория',
              type: 'relationship',
              relationTo: 'categories',
              index: true,
            }),
            fromSource({
              name: 'price',
              label: 'Цена, ₽ (минимальная)',
              type: 'number',
              required: true,
              admin: { components: cell('PriceCell') },
            }),
            fromSource({ name: 'oldPrice', label: 'Старая цена, ₽', type: 'number' }),
            fromSource({
              name: 'inStock',
              label: 'В наличии',
              type: 'checkbox',
              index: true,
              admin: { components: cell('FlagCell', { yes: 'В наличии', no: 'Нет' }) },
            }),
            fromSource({ name: 'composition', label: 'Состав', type: 'textarea' }),
            fromSource({ name: 'care', label: 'Уход', type: 'textarea' }),
            fromSource({ name: 'measurements', label: 'Обмеры', type: 'textarea' }),
            fromSource({ name: 'sourceUpdatedAt', label: 'Изменён в МойСкладе', type: 'date', index: true }),
            fromSource({
              name: 'externalId',
              label: 'ID в МойСкладе',
              type: 'text',
              required: true,
              unique: true,
              index: true,
            }),
            fromSource({
              name: 'variants',
              label: 'Варианты',
              type: 'array',
              fields: [
                { name: 'externalId', label: 'ID', type: 'text', required: true },
                { name: 'color', label: 'Цвет', type: 'text' },
                { name: 'size', label: 'Размер', type: 'text', required: true },
                { name: 'price', label: 'Цена, ₽', type: 'number', required: true },
                { name: 'available', label: 'Доступно, шт.', type: 'number', required: true },
              ],
            }),
          ],
        },
      ],
    },
  ],
}
