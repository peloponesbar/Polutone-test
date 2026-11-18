import type { Block } from 'payload'

/**
 * Page blocks the editor can add below the fixed top of a product page
 * (DESIGN_SYSTEM.md → «Блоки страницы товара»). Styling comes from the template;
 * the admin only chooses which blocks appear and in what order.
 */
const image = (name: string, label: string) =>
  ({ name, label, type: 'upload', relationTo: 'media', required: true }) as const

export const FullImageBlock: Block = {
  slug: 'fullImage',
  labels: { singular: 'Фото крупно', plural: 'Фото крупно' },
  fields: [image('image', 'Фото'), { name: 'caption', label: 'Подпись', type: 'text' }],
}

export const ImagePairBlock: Block = {
  slug: 'imagePair',
  labels: { singular: 'Пара фото', plural: 'Пара фото' },
  fields: [image('left', 'Фото слева'), image('right', 'Фото справа')],
}

export const QuoteBlock: Block = {
  slug: 'quote',
  labels: { singular: 'Акцентная фраза', plural: 'Акцентные фразы' },
  fields: [
    {
      name: 'text',
      label: 'Фраза',
      type: 'textarea',
      required: true,
      maxLength: 120,
      admin: { description: 'Коротко, не больше двух строк.' },
    },
  ],
}

export const TextBlock: Block = {
  slug: 'text',
  labels: { singular: 'Текст', plural: 'Тексты' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text' },
    {
      name: 'body',
      label: 'Текст',
      type: 'textarea',
      required: true,
      admin: { description: 'Абзацы разделяйте пустой строкой.' },
    },
  ],
}

export const MeasurementsImageBlock: Block = {
  slug: 'measurementsImage',
  labels: { singular: 'Обмеры на фото', plural: 'Обмеры на фото' },
  fields: [image('image', 'Схема изделия'), { name: 'caption', label: 'Подпись', type: 'text' }],
}

export const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: 'Видео', plural: 'Видео' },
  fields: [
    {
      name: 'video',
      label: 'Видео (mp4/webm)',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { contains: 'video' } },
    },
    {
      name: 'poster',
      label: 'Обложка',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { contains: 'image' } },
      admin: { description: 'Показывается, пока видео не запущено, и при «уменьшении движения».' },
    },
  ],
}

export const StyleWithBlock: Block = {
  slug: 'styleWith',
  labels: { singular: 'С чем носить', plural: 'С чем носить' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', defaultValue: 'С чем носить' },
    {
      name: 'products',
      label: 'Изделия',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      minRows: 2,
      maxRows: 4,
      required: true,
    },
  ],
}

export const productBlocks: Block[] = [
  FullImageBlock,
  ImagePairBlock,
  QuoteBlock,
  TextBlock,
  MeasurementsImageBlock,
  VideoBlock,
  StyleWithBlock,
]
