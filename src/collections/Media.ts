import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Фото и видео' },
  admin: {
    defaultColumns: ['filename', 'alt', 'color'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Описание для незрячих (alt)',
      type: 'text',
      required: true,
      admin: { description: 'Что на фото: вещь и посадка, без оценок («стильный образ» — нельзя).' },
    },
    {
      name: 'color',
      label: 'Цвет изделия на фото',
      type: 'text',
      index: true,
      admin: {
        description:
          'Как в МойСкладе (например, «Шалфей»). На карточке товара фото показываются для выбранного цвета. Пусто — для всех цветов.',
      },
    },
  ],
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
    // Photos are stored as WebP: several times lighter than PNG/JPEG at the same visible quality.
    formatOptions: { format: 'webp', options: { quality: 85 } },
    resizeOptions: { width: 2400, withoutEnlargement: true },
  },
}
