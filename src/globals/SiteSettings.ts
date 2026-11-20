import type { GlobalConfig } from 'payload'

import { checkOrigin } from '../lib/delivery/settings'
import { DELIVERY_DEFAULTS } from '../lib/delivery/rules'
import { SETTINGS_DEFAULTS, validators } from '../lib/settings/format'

const D = SETTINGS_DEFAULTS
const validate = (check: (value: unknown) => true | string) => (value: unknown) => check(value)

/**
 * Shop-wide texts and contacts: footer, contacts page, order page, link previews and the
 * bar above the header. No drafts — a save goes live at once. Everything here is public.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  access: { read: () => true },
  hooks: { beforeChange: [checkOrigin] },
  admin: {
    group: 'Настройки',
    description: 'Контакты, реквизиты, подвал и описание для поисковиков. Изменения видны на сайте сразу после сохранения.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Контакты',
          name: 'contacts',
          description: 'Показываются в подвале, на странице «Контакты» и на странице заказа. Пустое поле на сайте не видно.',
          fields: [
            {
              name: 'telegram',
              label: 'Telegram',
              type: 'text',
              validate: validate(validators.telegram),
              admin: { description: 'Ник или ссылка: @polutone, t.me/polutone.' },
            },
            {
              name: 'vk',
              label: 'ВКонтакте',
              type: 'text',
              validate: validate(validators.vk),
              admin: { description: 'Адрес страницы: polutone или vk.com/polutone.' },
            },
            {
              name: 'avito',
              label: 'Авито',
              type: 'text',
              validate: validate(validators.avito),
              admin: { description: 'Полная ссылка на профиль магазина.' },
            },
            { name: 'email', label: 'Почта', type: 'email', validate: validate(validators.email) },
            {
              name: 'phone',
              label: 'Телефон',
              type: 'text',
              validate: validate(validators.phone),
              admin: { description: 'В любом виде: +7 900 123-45-67, 8 800 …' },
            },
            {
              name: 'hours',
              label: 'Когда отвечаем',
              type: 'text',
              admin: { description: 'Например: «Ежедневно с 10:00 до 20:00 по Москве».' },
            },
          ],
        },
        {
          label: 'Реквизиты',
          name: 'legal',
          description:
            'Сведения о продавце: по закону интернет-магазин показывает их покупателям. Строка в подвале появится, когда заполнено «Продавец».',
          fields: [
            {
              name: 'seller',
              label: 'Продавец',
              type: 'text',
              admin: { description: 'Например: «ИП Иванов Иван Иванович».' },
            },
            { name: 'inn', label: 'ИНН', type: 'text', validate: validate(validators.inn) },
            { name: 'ogrn', label: 'ОГРНИП', type: 'text', validate: validate(validators.ogrn) },
            { name: 'address', label: 'Адрес', type: 'text', admin: { description: 'Необязательно.' } },
          ],
        },
        {
          label: 'Полоса объявления',
          name: 'announcement',
          description: 'Тонкая строка над шапкой на всех страницах.',
          fields: [
            { name: 'enabled', label: 'Показывать', type: 'checkbox', defaultValue: D.announcement.enabled },
            {
              name: 'text',
              label: 'Текст',
              type: 'text',
              defaultValue: D.announcement.text,
              maxLength: 120,
              admin: { description: 'Коротко, до 120 знаков: «Бесплатная доставка от 5 000 ₽».' },
            },
            {
              name: 'link',
              label: 'Ссылка',
              type: 'text',
              validate: validate(validators.link),
              admin: { description: 'Необязательно. Страница сайта (/info/dostavka) или полный адрес.' },
            },
          ],
        },
        {
          label: 'Доставка',
          name: 'delivery',
          description:
            'Откуда и как отправляем посылки СДЭК. Город и пункт сдачи — коды СДЭК: при сохранении сайт проверит их и подпишет адрес.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'originCity',
                  label: 'Город отправки (код СДЭК)',
                  type: 'number',
                  admin: { width: '50%', description: 'Например, код Красной Поляны в базе СДЭК.' },
                },
                {
                  name: 'shipmentPoint',
                  label: 'Пункт сдачи посылок (код СДЭК)',
                  type: 'text',
                  admin: { width: '50%', description: 'Пункт, куда вы относите посылки, например «SOC12».' },
                },
              ],
            },
            {
              name: 'originLabel',
              label: 'Проверено',
              type: 'text',
              admin: { readOnly: true, description: 'Заполняется само после сохранения: город и адрес пункта сдачи.' },
            },
            {
              name: 'freeFrom',
              label: 'Бесплатная доставка от, ₽',
              type: 'number',
              min: 0,
              admin: { description: 'Сумма товаров, от которой доставку оплачивает магазин. Пусто — доставка всегда платная.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'boxLength', label: 'Коробка: длина, см', type: 'number', min: 1, defaultValue: DELIVERY_DEFAULTS.box.length, admin: { width: '25%' } },
                { name: 'boxWidth', label: 'ширина, см', type: 'number', min: 1, defaultValue: DELIVERY_DEFAULTS.box.width, admin: { width: '25%' } },
                { name: 'boxHeight', label: 'высота, см', type: 'number', min: 1, defaultValue: DELIVERY_DEFAULTS.box.height, admin: { width: '25%' } },
                {
                  name: 'packagingWeight',
                  label: 'Упаковка, г',
                  type: 'number',
                  min: 0,
                  defaultValue: DELIVERY_DEFAULTS.packagingWeight,
                  admin: { width: '25%' },
                },
              ],
            },
          ],
        },
        {
          label: 'Подвал',
          name: 'footer',
          fields: [
            {
              name: 'tagline',
              label: 'Слоган под логотипом',
              type: 'text',
              defaultValue: D.footer.tagline,
            },
          ],
        },
        {
          label: 'Поисковики и ссылки',
          name: 'seo',
          description: 'Как сайт выглядит в поиске и в превью ссылки в Telegram и ВКонтакте.',
          fields: [
            { name: 'title', label: 'Название сайта', type: 'text', defaultValue: D.seo.title, maxLength: 70 },
            {
              name: 'description',
              label: 'Описание',
              type: 'textarea',
              defaultValue: D.seo.description,
              maxLength: 200,
              admin: { description: 'Одна-две фразы, до 160 знаков — длиннее поиск обрежет.' },
            },
            {
              name: 'image',
              label: 'Картинка для превью',
              type: 'upload',
              relationTo: 'media',
              filterOptions: { mimeType: { contains: 'image' } },
              admin: { description: 'Горизонтальная, лучше 1200 × 630 px. Пусто — превью без картинки.' },
            },
          ],
        },
      ],
    },
  ],
}
