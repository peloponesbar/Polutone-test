import type { CollectionConfig } from 'payload'

import { shipOrder, syncShipment } from '../lib/delivery/ship'
import { CANCEL_REASONS, DELIVERY_METHODS, DELIVERY_SERVICES, ORDER_STATUSES, PAYMENT_METHODS } from '../lib/orders/options'

const options = (list: readonly { value: string; label: string }[]) => list.map(({ value, label }) => ({ value, label }))
const cell = (name: string, clientProps?: Record<string, unknown>) => ({
  Cell: { path: `/components/admin/cells#${name}`, clientProps },
})

/**
 * Orders from the site. Created only by checkout (src/lib/orders/place.ts); the items and
 * sums are a snapshot taken at that moment. Admins change the status and keep notes.
 * Customers' personal data: readable by admins only.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Заказ', plural: 'Заказы' },
  admin: {
    group: 'Магазин',
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt', 'customerName', 'total', 'status'],
    listSearchableFields: ['title', 'customerName', 'phone', 'email'],
    description: 'Заказы с сайта. Состав и суммы — как в момент оформления; меняются статус и заметка.',
  },
  defaultSort: '-number',
  endpoints: [
    {
      // «Передать в СДЭК» in the admin (signed-in staff only).
      path: '/:id/ship',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ ok: false }, { status: 401 })
        const id = Number(req.routeParams?.id)
        if (!Number.isInteger(id)) return Response.json({ ok: false }, { status: 400 })
        const result = await shipOrder(req.payload, id)
        if (result === 'created') await syncShipment(req.payload, id)
        return Response.json({ ok: result !== 'failed', result })
      },
    },
  ],
  hooks: {
    beforeChange: [
      // An admin cancelling by hand: record it, so the buyer's page doesn't blame the payment.
      ({ data, originalDoc }) => {
        if (data.status === 'cancelled' && originalDoc?.status !== 'cancelled' && !data.cancelReason) data.cancelReason = 'shop'
        return data
      },
    ],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    // Only checkout creates orders; cancelled orders stay for the record.
    create: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'title',
      label: 'Заказ',
      type: 'text',
      required: true,
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'number',
      label: 'Номер',
      type: 'number',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      required: true,
      defaultValue: 'awaiting_payment',
      index: true,
      options: options(ORDER_STATUSES),
      admin: { position: 'sidebar', components: cell('StatusCell') },
    },
    {
      name: 'token',
      label: 'Код страницы заказа',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'moyskladId',
      label: 'Заказ в МойСкладе',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Пусто — заказ не передан в МойСклад: создайте его там вручную.',
      },
    },
    {
      name: 'paidAt',
      label: 'Оплачен',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMMM yyyy, HH:mm' } },
    },
    {
      name: 'paymentId',
      label: 'Платёж в ЮKassa',
      type: 'text',
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Последний созданный платёж по заказу.' },
    },
    {
      name: 'paymentAttempts',
      type: 'number',
      defaultValue: 0,
      admin: { hidden: true },
    },
    {
      name: 'trackNumber',
      label: 'Трек-номер СДЭК',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'shipmentStatus',
      label: 'Статус в СДЭК',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'shipmentId',
      label: 'Заказ в СДЭК',
      type: 'text',
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Пусто у оплаченного заказа — он не передан в СДЭК.' },
    },
    {
      name: 'shipAction',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/ShipButton#ShipButton' } },
    },
    {
      name: 'cancelReason',
      label: 'Причина отмены',
      type: 'select',
      options: options(CANCEL_REASONS),
      admin: { readOnly: true, position: 'sidebar', condition: (data) => data?.status === 'cancelled' },
    },
    {
      name: 'note',
      label: 'Заметка для команды',
      type: 'textarea',
      admin: { position: 'sidebar', description: 'Покупатель её не видит.' },
    },
    {
      name: 'summary',
      type: 'ui',
      admin: { components: { Field: '/components/admin/OrderSummary#OrderSummary' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Позиции подробно',
          fields: [
            {
              name: 'items',
              label: 'Позиции',
              type: 'array',
              required: true,
              minRows: 1,
              labels: { singular: 'Позиция', plural: 'Позиции' },
              admin: { readOnly: true, initCollapsed: true },
              fields: [
                { name: 'product', label: 'Товар', type: 'relationship', relationTo: 'products' },
                { name: 'variantId', label: 'ID варианта в МойСкладе', type: 'text', required: true },
                { name: 'title', label: 'Название', type: 'text', required: true },
                { name: 'color', label: 'Цвет', type: 'text' },
                { name: 'size', label: 'Размер', type: 'text' },
                { name: 'price', label: 'Цена, ₽', type: 'number', required: true },
                { name: 'qty', label: 'Количество', type: 'number', required: true },
                { name: 'lineTotal', label: 'Сумма, ₽', type: 'number', required: true },
                { name: 'weight', label: 'Вес одной вещи, г', type: 'number' },
              ],
            },
            { name: 'itemsTotal', label: 'Товары, ₽', type: 'number', required: true, admin: { readOnly: true } },
            {
              name: 'deliveryCost',
              label: 'Доставка, ₽',
              type: 'number',
              admin: { readOnly: true, description: 'Пусто — стоимость доставки сообщается покупателю отдельно.' },
            },
            {
              name: 'total',
              label: 'Итого, ₽',
              type: 'number',
              required: true,
              admin: { readOnly: true, components: cell('PriceCell') },
            },
          ],
        },
        {
          label: 'Покупатель и доставка',
          description: 'Исправьте здесь опечатку в телефоне или адресе, если покупатель попросил.',
          fields: [
            { name: 'customerName', label: 'Имя', type: 'text', required: true },
            { name: 'phone', label: 'Телефон', type: 'text', required: true },
            { name: 'email', label: 'Почта', type: 'email', required: true },
            {
              name: 'deliveryService',
              label: 'Служба доставки',
              type: 'select',
              required: true,
              options: options(DELIVERY_SERVICES),
            },
            {
              name: 'deliveryMethod',
              label: 'Способ',
              type: 'select',
              required: true,
              options: options(DELIVERY_METHODS),
            },
            { name: 'city', label: 'Город', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'cityCode', label: 'Код города в СДЭК', type: 'number', admin: { readOnly: true, width: '33%' } },
                { name: 'pickupPoint', label: 'Пункт выдачи (код)', type: 'text', admin: { readOnly: true, width: '33%' } },
                { name: 'deliveryDays', label: 'Срок доставки', type: 'text', admin: { readOnly: true, width: '33%' } },
              ],
            },
            { name: 'tariffCode', type: 'number', admin: { hidden: true } },
            { name: 'address', label: 'Адрес или пункт выдачи', type: 'textarea', required: true },
            {
              name: 'paymentMethod',
              label: 'Оплата',
              type: 'select',
              required: true,
              options: options(PAYMENT_METHODS),
            },
            { name: 'comment', label: 'Комментарий покупателя', type: 'textarea', admin: { readOnly: true } },
            {
              name: 'consentAt',
              label: 'Согласие на обработку данных',
              type: 'date',
              required: true,
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMMM yyyy, HH:mm' } },
            },
          ],
        },
      ],
    },
  ],
}
