import type { GlobalConfig } from 'payload'

import { DRAFT_VERSIONS, PUBLISHED, previewPathFor, previewUrl } from '../lib/preview'

const image = (name: string, label: string, description?: string) =>
  ({
    name,
    label,
    type: 'upload',
    relationTo: 'media',
    filterOptions: { mimeType: { contains: 'image' } },
    admin: description ? { description } : undefined,
  }) as const

/** Home page content editable in the admin; layout and styling come from the template. */
export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Главная',
  // Visitors get the published version only; drafts are for signed-in admins.
  access: { read: ({ req }) => (req.user ? true : PUBLISHED) },
  versions: DRAFT_VERSIONS,
  admin: {
    group: 'Контент',
    livePreview: { url: ({ req }) => previewUrl(req, previewPathFor('home')) },
    preview: (_doc, { req }) => previewUrl(req, previewPathFor('home')),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Первый экран',
          name: 'hero',
          fields: [
            image('image', 'Заглавная картинка', 'Широкая, от 1600 px. Показывается целиком на любом экране, без обрезки.'),
            { name: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Выразительность в полутоне.' },
            {
              name: 'text',
              label: 'Подзаголовок',
              type: 'text',
              defaultValue: 'Коллекция 01. Свободный крой, унисекс, спокойные цвета.',
            },
          ],
        },
        {
          label: 'О бренде',
          name: 'about',
          fields: [
            { name: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Не громче. Точнее.' },
            {
              name: 'text',
              label: 'Текст',
              type: 'textarea',
              defaultValue:
                'POLUTONE — минималистичная одежда универсального кроя. Мы убираем всё, что спорит с человеком, и оставляем одну точную деталь.\n\nСвободная посадка, унисекс, спокойные цвета. Одежда, которая подчёркивает вас и не говорит вместо вас.',
              admin: { description: 'Абзацы разделяйте пустой строкой.' },
            },
            image('image', 'Фото'),
          ],
        },
        {
          label: 'Вещь сезона',
          name: 'featured',
          fields: [
            { name: 'label', label: 'Метка', type: 'text', defaultValue: 'Вещь сезона' },
            {
              name: 'product',
              label: 'Изделие',
              type: 'relationship',
              relationTo: 'products',
              admin: { description: 'Пусто — блок не показывается.' },
            },
            image('image', 'Фото', 'Пусто — берётся первое фото изделия.'),
          ],
        },
      ],
    },
  ],
}
