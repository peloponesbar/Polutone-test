import type { CollectionConfig } from 'payload'

import { DRAFT_VERSIONS, PUBLISHED, previewPathFor, previewUrl } from '../lib/preview'

/** Pages of the «Информация» menu: delivery, payment, returns, sizes, care, contacts. */
export const InfoPages: CollectionConfig = {
  slug: 'info-pages',
  labels: { singular: 'Страница «Информация»', plural: 'Информация' },
  admin: {
    useAsTitle: 'title',
    group: 'Контент',
    defaultColumns: ['title', 'slug', 'menuOrder', '_status'],
    description: 'Пункты выпадающего меню «Информация» — в порядке поля «Порядок в меню».',
    livePreview: {
      url: ({ data, req }) => previewUrl(req, previewPathFor('info-pages', data?.slug)),
    },
    preview: (doc, { req }) => previewUrl(req, previewPathFor('info-pages', doc.slug)),
  },
  defaultSort: 'menuOrder',
  versions: DRAFT_VERSIONS,
  access: {
    read: ({ req }) => (req.user ? true : PUBLISHED),
  },
  fields: [
    {
      name: 'menuOrder',
      label: 'Порядок в меню',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
    {
      name: 'slug',
      label: 'Адрес (slug)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Латиницей, например «dostavka» → /info/dostavka.' },
    },
    { name: 'title', label: 'Заголовок', type: 'text', required: true },
    {
      name: 'intro',
      label: 'Вступление',
      type: 'textarea',
      admin: { description: 'Одна-две фразы под заголовком.' },
    },
    {
      name: 'sections',
      label: 'Разделы',
      type: 'array',
      labels: { singular: 'Раздел', plural: 'Разделы' },
      fields: [
        { name: 'heading', label: 'Подзаголовок', type: 'text' },
        {
          name: 'text',
          label: 'Текст',
          type: 'textarea',
          required: true,
          admin: { description: 'Абзацы разделяйте пустой строкой.' },
        },
      ],
    },
    {
      name: 'showSizeCharts',
      label: 'Показать таблицы размеров всех изделий',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Для страницы «Таблица размеров»: под текстом — обмеры каждой модели из МойСклада.' },
    },
  ],
}
