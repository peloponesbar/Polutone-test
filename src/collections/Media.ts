import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Фото и видео' },
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
  ],
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
  },
}
