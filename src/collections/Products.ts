import type { CollectionConfig, Field, Where } from 'payload'

import { getCatalogSource } from '../lib/catalog/source'
import { syncCatalog } from '../lib/catalog/sync'
import { productBlocks } from './productBlocks'

/** What visitors may see: published and still present in the source. */
export const PUBLIC_PRODUCTS: Where = {
  and: [{ published: { equals: true } }, { inSource: { equals: true } }],
}

const fromSource = (field: Field): Field =>
  ({ ...field, admin: { ...('admin' in field ? field.admin : {}), readOnly: true } }) as Field

/**
 * Products: commerce data comes from the catalog source (MoySklad) and is read-only here;
 * presentation (photos, description, page blocks) and publishing are edited in the admin.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Товар', plural: 'Товары' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'article', 'category', 'price', 'published', 'inSource'],
    description:
      'Название, цены, варианты и остатки приходят из МойСклада. Здесь — фото, подача и публикация.',
    components: {
      beforeListTable: ['/components/admin/SyncButton#SyncButton'],
    },
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
    {
      name: 'published',
      label: 'Опубликован на сайте',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar' },
    },
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
      admin: { position: 'sidebar', description: 'Снят — товар удалён в МойСкладе и скрыт с сайта.' },
    }),
    fromSource({
      name: 'syncedAt',
      label: 'Синхронизирован',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Подача',
          fields: [
            {
              name: 'images',
              label: 'Фото (по порядку показа)',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              filterOptions: { mimeType: { contains: 'image' } },
              admin: { description: 'Первое фото — в каталоге и первым в галерее. Соотношение 4:5.' },
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
              blocks: productBlocks,
              admin: { description: 'Идут под основной частью страницы, в заданном порядке.' },
            },
          ],
        },
        {
          label: 'Данные МойСклада',
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
            fromSource({ name: 'price', label: 'Цена, ₽ (минимальная)', type: 'number', required: true }),
            fromSource({ name: 'oldPrice', label: 'Старая цена, ₽', type: 'number' }),
            fromSource({ name: 'inStock', label: 'В наличии', type: 'checkbox', index: true }),
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
