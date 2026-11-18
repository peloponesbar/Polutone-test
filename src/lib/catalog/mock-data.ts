import type { MsAssortment, MsProduct, MsVariant } from './moysklad-format'

/**
 * Fictional test assortment in MoySklad API format (prices in kopecks).
 * Not real POLUTONE products — used until the real MoySklad account is connected.
 */
const API = 'https://api.moysklad.ru/api/remap/1.2/entity/product'

const TEST_NOTE = 'Тестовые данные.'
const CARE = `${TEST_NOTE} Деликатная стирка при 30 °C, сушить в расправленном виде.`

const JACKET_CHART = [
  'Размер | Длина, см | Ширина по груди, см | Длина рукава, см',
  'XS | 70 | 56 | 60',
  'S | 72 | 58 | 61',
  'M | 74 | 60 | 62',
  'L | 76 | 62 | 63',
  'XL | 78 | 64 | 64',
].join('\n')

const TROUSERS_CHART = [
  'Размер | Обхват талии, см | Длина по внешнему шву, см',
  'XS | 66 | 102',
  'S | 70 | 104',
  'M | 74 | 106',
  'L | 78 | 108',
  'XL | 82 | 110',
].join('\n')

type ProductSpec = {
  id: string
  name: string
  article: string
  folder: string
  updated: string
  price: number
  oldPrice?: number
  composition: string
  chart: string
  colors: string[]
  /** Available quantity per size, same for every color unless overridden. */
  stock: Record<string, number>
  stockOverrides?: Record<string, Record<string, number>>
  variantPrices?: Record<string, number>
}

const SPECS: ProductSpec[] = [
  {
    id: 'a1f0c3e2-0001-4f6e-9a10-000000000001',
    name: 'Жакет прямой',
    article: 'PT-JK-001',
    folder: 'Одежда/Жакеты',
    updated: '2026-11-10 12:00:00.000',
    price: 1890000,
    composition: `${TEST_NOTE} Шерсть 70%, полиэстер 30%.`,
    chart: JACKET_CHART,
    colors: ['Графит', 'Камень'],
    stock: { XS: 2, S: 4, M: 5, L: 3, XL: 1 },
    stockOverrides: { Камень: { XS: 0, XL: 0 } },
  },
  {
    id: 'a1f0c3e2-0002-4f6e-9a10-000000000002',
    name: 'Рубашка свободная',
    article: 'PT-SH-002',
    folder: 'Одежда/Рубашки',
    updated: '2026-11-12 09:30:00.000',
    price: 890000,
    composition: `${TEST_NOTE} Хлопок 100%.`,
    chart: JACKET_CHART,
    colors: ['Молочный', 'Шалфей'],
    stock: { XS: 3, S: 6, M: 6, L: 4, XL: 2 },
  },
  {
    id: 'a1f0c3e2-0003-4f6e-9a10-000000000003',
    name: 'Брюки широкие',
    article: 'PT-TR-003',
    folder: 'Одежда/Брюки',
    updated: '2026-11-08 15:00:00.000',
    price: 1190000,
    oldPrice: 1390000,
    composition: `${TEST_NOTE} Шерсть 60%, вискоза 40%.`,
    chart: TROUSERS_CHART,
    colors: ['Графит'],
    stock: { XS: 0, S: 2, M: 3, L: 0, XL: 1 },
  },
  {
    id: 'a1f0c3e2-0004-4f6e-9a10-000000000004',
    name: 'Джемпер тонкой вязки',
    article: 'PT-KN-004',
    folder: 'Одежда/Трикотаж',
    updated: '2026-11-14 11:00:00.000',
    price: 990000,
    composition: `${TEST_NOTE} Мериносовая шерсть 100%.`,
    chart: JACKET_CHART,
    colors: ['Камень', 'Графит', 'Молочный'],
    stock: { S: 3, M: 4, L: 3 },
  },
  {
    id: 'a1f0c3e2-0005-4f6e-9a10-000000000005',
    name: 'Пальто-халат',
    article: 'PT-OW-005',
    folder: 'Одежда/Верхняя одежда',
    updated: '2026-11-15 10:00:00.000',
    price: 3490000,
    composition: `${TEST_NOTE} Шерсть 80%, полиамид 20%.`,
    chart: JACKET_CHART,
    colors: ['Камень'],
    stock: { XS: 1, S: 2, M: 2, L: 1, XL: 1 },
    variantPrices: { XL: 3690000 },
  },
  {
    id: 'a1f0c3e2-0006-4f6e-9a10-000000000006',
    name: 'Футболка плотная',
    article: 'PT-TS-006',
    folder: 'Одежда/Трикотаж',
    updated: '2026-11-05 14:00:00.000',
    price: 390000,
    composition: `${TEST_NOTE} Хлопок 100%.`,
    chart: JACKET_CHART,
    colors: ['Молочный', 'Графит'],
    stock: { XS: 5, S: 8, M: 8, L: 6, XL: 4 },
  },
  {
    id: 'a1f0c3e2-0007-4f6e-9a10-000000000007',
    name: 'Брюки на завязках',
    article: 'PT-TR-007',
    folder: 'Одежда/Брюки',
    updated: '2026-11-03 16:00:00.000',
    price: 790000,
    composition: `${TEST_NOTE} Лён 55%, хлопок 45%.`,
    chart: TROUSERS_CHART,
    colors: ['Шалфей'],
    stock: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
  },
  {
    id: 'a1f0c3e2-0008-4f6e-9a10-000000000008',
    name: 'Шарф объёмный',
    article: 'PT-AC-008',
    folder: 'Аксессуары',
    updated: '2026-11-16 13:00:00.000',
    price: 490000,
    composition: `${TEST_NOTE} Шерсть 100%.`,
    chart: '',
    colors: ['Графит', 'Камень'],
    stock: { 'ONE SIZE': 6 },
  },
]

function toProduct(spec: ProductSpec): MsProduct {
  return {
    id: spec.id,
    name: spec.name,
    article: spec.article,
    pathName: spec.folder,
    updated: spec.updated,
    salePrices: [
      { value: spec.price, priceType: { name: 'Цена продажи' } },
      ...(spec.oldPrice ? [{ value: spec.oldPrice, priceType: { name: 'Старая цена' } }] : []),
    ],
    attributes: [
      { name: 'Состав', value: spec.composition },
      { name: 'Уход', value: CARE },
      ...(spec.chart ? [{ name: 'Обмеры', value: spec.chart }] : []),
    ],
  }
}

function toVariants(spec: ProductSpec): MsVariant[] {
  return spec.colors.flatMap((color, colorIndex) =>
    Object.entries(spec.stock).map(([size, quantity], sizeIndex) => {
      const variantPrice = spec.variantPrices?.[size]
      return {
        id: `${spec.id}-v${colorIndex}${sizeIndex}`,
        product: { meta: { href: `${API}/${spec.id}` } },
        characteristics: [
          { name: 'Цвет', value: color },
          { name: 'Размер', value: size },
        ],
        salePrices: variantPrice
          ? [{ value: variantPrice, priceType: { name: 'Цена продажи' } }]
          : [],
        quantity: spec.stockOverrides?.[color]?.[size] ?? quantity,
      }
    }),
  )
}

export function mockAssortment(): MsAssortment {
  return {
    products: SPECS.map(toProduct),
    variants: SPECS.flatMap(toVariants),
  }
}
