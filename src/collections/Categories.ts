import type { CollectionConfig } from 'payload'

/** Product categories. Created by catalog sync from MoySklad folders; order is set by hand. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
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
      admin: { description: 'Показывается в разделе «Категории» на главной. Соотношение 4:5.' },
    },
    {
      name: 'order',
      label: 'Порядок в каталоге',
      type: 'number',
      defaultValue: 100,
      admin: { description: 'Меньше — левее во вкладках каталога.' },
    },
  ],
}
