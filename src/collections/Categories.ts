import type { CollectionConfig } from 'payload'

import { DELIVERY_DEFAULTS } from '../lib/delivery/rules'

/** Product categories. Created by catalog sync from MoySklad folders; order is set by hand. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: {
    useAsTitle: 'name',
    group: 'Магазин',
    defaultColumns: ['image', 'name', 'slug', 'order'],
    description: 'Создаются автоматически при синхронизации по папкам МойСклада.',
  },
  defaultSort: 'order',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      label: 'Название',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      name: 'slug',
      label: 'Адрес (slug)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'image',
      label: 'Фото для главной',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { contains: 'image' } },
      admin: {
        description: 'Показывается в разделе «Категории» на главной. Соотношение 4:5.',
        components: { Cell: '/components/admin/cells#ThumbCell' },
      },
    },
    {
      name: 'order',
      label: 'Порядок в каталоге',
      type: 'number',
      defaultValue: 100,
      admin: { description: 'Меньше — левее во вкладках каталога.' },
    },
    {
      name: 'itemWeight',
      label: 'Вес одной вещи, г',
      type: 'number',
      min: 1,
      defaultValue: DELIVERY_DEFAULTS.itemWeight,
      admin: { description: 'Для расчёта доставки СДЭК. Позже будет приходить из МойСклада.' },
    },
  ],
}
