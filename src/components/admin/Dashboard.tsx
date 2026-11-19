import type { Payload, Where } from 'payload'

import { PUBLIC_PRODUCTS } from '@/collections/Products'

// Admin home: a link to the live site, the catalog state at a glance, and recent edits.

type Props = { payload: Payload }

const LIST = '/admin/collections/products'
type Listed = 'products' | 'orders'
export const filterUrl = (where: Where, collection: Listed = 'products') =>
  `/admin/collections/${collection}?${toQuery(where)}`

/** Payload list filters use qs-style params: where[field][op]=value, where[and][0][field][op]=value. */
function toQuery(where: Where): string {
  const params = new URLSearchParams()
  const add = (prefix: string, value: unknown) => {
    if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) add(`${prefix}[${key}]`, inner)
    } else {
      params.set(prefix, String(value))
    }
  }
  add('where', where)
  return params.toString()
}

export const NOT_PUBLISHED: Where = { _status: { equals: 'draft' }, inSource: { equals: true } }
export const HIDDEN: Where = { inSource: { equals: false } }
export const OUT_OF_STOCK: Where = { _status: { equals: 'published' }, inSource: { equals: true }, inStock: { equals: false } }

const ORDER_STATUS = (status: string): Where => ({ status: { equals: status } })

type Tile = { label: string; value: number; href: string }

type Edit = { title: string; section: string; href: string; updatedAt: string }

async function recentEdits(payload: Payload): Promise<Edit[]> {
  const [products, pages, home] = await Promise.all([
    payload.find({ collection: 'products', sort: '-updatedAt', limit: 6, depth: 0, select: { title: true, updatedAt: true } }),
    payload.find({ collection: 'info-pages', sort: '-updatedAt', limit: 6, depth: 0, select: { title: true, updatedAt: true } }),
    payload.findGlobal({ slug: 'home', depth: 0, draft: true }),
  ])
  const edits: Edit[] = [
    ...products.docs.map((d) => ({ title: d.title, section: 'Товар', href: `${LIST}/${d.id}`, updatedAt: d.updatedAt })),
    ...pages.docs.map((d) => ({
      title: d.title,
      section: 'Информация',
      href: `/admin/collections/info-pages/${d.id}`,
      updatedAt: d.updatedAt,
    })),
  ]
  if (home.updatedAt) edits.push({ title: 'Главная', section: 'Страница', href: '/admin/globals/home', updatedAt: home.updatedAt })
  return edits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
}

const when = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export async function Dashboard({ payload }: Props) {
  let data: { groups: { title: string; tiles: Tile[] }[]; edits: Edit[] } | null = null
  try {
    const tile = async (label: string, collection: Listed, where: Where): Promise<Tile> => ({
      label,
      value: (await payload.count({ collection, where })).totalDocs,
      href: filterUrl(where, collection),
    })
    const [orders, products, edits] = await Promise.all([
      Promise.all([
        tile('Ждут оплаты', 'orders', ORDER_STATUS('awaiting_payment')),
        tile('Оплачены — собрать', 'orders', ORDER_STATUS('paid')),
        tile('Собираются', 'orders', ORDER_STATUS('assembling')),
        tile('Переданы в доставку', 'orders', ORDER_STATUS('shipped')),
      ]),
      Promise.all([
        tile('На сайте', 'products', PUBLIC_PRODUCTS),
        tile('Ждут публикации', 'products', NOT_PUBLISHED),
        tile('Нет в наличии', 'products', OUT_OF_STOCK),
        tile('Убраны из МойСклада', 'products', HIDDEN),
      ]),
      recentEdits(payload),
    ])
    data = { groups: [{ title: 'Заказы', tiles: orders }, { title: 'Товары', tiles: products }], edits }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Admin dashboard: failed to load summary' })
  }

  return (
    <section className="polutone-dash" aria-label="Сводка">
      <div className="polutone-dash__head">
        <h1>POLUTONE</h1>
        <a className="btn btn--style-primary btn--size-medium polutone-dash__site" href="/" target="_blank" rel="noopener">
          Открыть сайт ↗
        </a>
      </div>

      {!data && <p role="alert">Не удалось загрузить сводку. Обновите страницу.</p>}

      {data?.groups.map((group) => (
        <div key={group.title}>
          <h2 className="polutone-dash__title">{group.title}</h2>
          <ul className="polutone-dash__tiles">
            {group.tiles.map((t) => (
              <li key={t.label}>
                <a href={t.href}>
                  <span className="polutone-dash__value">{t.value}</span>
                  <span>{t.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {data && data.edits.length > 0 && (
        <>
          <h2 className="polutone-dash__title">Последние правки</h2>
          <ul className="polutone-dash__edits">
            {data.edits.map((e) => (
              <li key={e.href}>
                <a href={e.href}>{e.title}</a>
                <span>{e.section}</span>
                <time dateTime={e.updatedAt}>{when.format(new Date(e.updatedAt))}</time>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Nav link to the live site, under the sections. */
export function SiteLink() {
  return (
    <a className="nav__link polutone-site-link" href="/" target="_blank" rel="noopener">
      <span className="nav__link-label">Открыть сайт ↗</span>
    </a>
  )
}
