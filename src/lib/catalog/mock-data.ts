import type { MsAssortment, MsProduct, MsVariant } from './moysklad-format'

/**
 * Test assortment in MoySklad API format (prices in kopecks): the six models from the
 * local photo pack (D:\CLoude\photo). Prices, stock and composition are fictional.
 * Article = model code from the photo pack, so photos can be matched to products.
 */
const API = 'https://api.moysklad.ru/api/remap/1.2/entity/product'

const TEST_NOTE = 'Тестовые данные.'
const CARE = `${TEST_NOTE} Стирка при 30 °C наизнанку, сушить в расправленном виде.`

/** Colors in the photo pack, in display order. */
export const MOCK_COLORS = ['Молочный', 'Графит', 'Шалфей', 'Пыльная роза', 'Дымчатый синий'] as const

const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const

const chart = (headers: string[], rows: number[][]) =>
  [headers.join(' | '), ...rows.map((r, i) => [SIZES[i], ...r].join(' | '))].join('\n')

const TOP_CHART = chart(
  ['Размер', 'Длина, см', 'Ширина по груди, см', 'Длина рукава, см'],
  [
    [66, 60, 56],
    [68, 62, 57],
    [70, 64, 58],
    [72, 66, 59],
    [74, 68, 60],
  ],
)
const TEE_CHART = chart(
  ['Размер', 'Длина, см', 'Ширина по груди, см'],
  [
    [68, 56],
    [70, 58],
    [72, 60],
    [74, 62],
    [76, 64],
  ],
)
const TROUSERS_CHART = chart(
  ['Размер', 'Обхват талии, см', 'Длина по внешнему шву, см'],
  [
    [64, 102],
    [68, 104],
    [72, 106],
    [76, 108],
    [80, 110],
  ],
)

type ModelSpec = {
  id: string
  article: string
  name: string
  folder: string
  updated: string
  price: number
  oldPrice?: number
  composition: string
  chart: string
  stock: Record<string, number>
  /** Per-color stock overrides, e.g. a sold-out color. */
  stockByColor?: Partial<Record<(typeof MOCK_COLORS)[number], Record<string, number>>>
}

const stock = (xs: number, s: number, m: number, l: number, xl: number) => ({ XS: xs, S: s, M: m, L: l, XL: xl })
const SOLD_OUT = stock(0, 0, 0, 0, 0)

export const MOCK_MODELS: ModelSpec[] = [
  {
    id: 'b2e1d4f0-0001-4c3a-8f00-0000000000h1',
    article: 'H01',
    name: 'Худи-пуловер с карманом-кенгуру',
    folder: 'Одежда/Худи',
    updated: '2026-11-16 12:00:00.000',
    price: 790000,
    composition: `${TEST_NOTE} Хлопок 80%, полиэстер 20%.`,
    chart: TOP_CHART,
    stock: stock(2, 5, 6, 4, 2),
    stockByColor: { 'Пыльная роза': stock(0, 2, 3, 0, 0) },
  },
  {
    id: 'b2e1d4f0-0002-4c3a-8f00-0000000000h2',
    article: 'H02',
    name: 'Зип-худи с прорезными карманами',
    folder: 'Одежда/Худи',
    updated: '2026-11-15 12:00:00.000',
    price: 890000,
    composition: `${TEST_NOTE} Хлопок 80%, полиэстер 20%.`,
    chart: TOP_CHART,
    stock: stock(1, 3, 4, 3, 1),
  },
  {
    id: 'b2e1d4f0-0003-4c3a-8f00-0000000000p1',
    article: 'P01',
    name: 'Прямые брюки с передним швом',
    folder: 'Одежда/Брюки',
    updated: '2026-11-14 12:00:00.000',
    price: 690000,
    oldPrice: 790000,
    composition: `${TEST_NOTE} Хлопок 70%, полиэстер 30%.`,
    chart: TROUSERS_CHART,
    stock: stock(2, 4, 5, 3, 1),
  },
  {
    id: 'b2e1d4f0-0004-4c3a-8f00-0000000000p2',
    article: 'P02',
    name: 'Прямые брюки без переднего шва',
    folder: 'Одежда/Брюки',
    updated: '2026-11-12 12:00:00.000',
    price: 650000,
    composition: `${TEST_NOTE} Хлопок 70%, полиэстер 30%.`,
    chart: TROUSERS_CHART,
    stock: stock(0, 3, 4, 2, 0),
    stockByColor: { 'Дымчатый синий': SOLD_OUT },
  },
  {
    id: 'b2e1d4f0-0005-4c3a-8f00-0000000000t1',
    article: 'T01',
    name: 'Футболка свободного кроя',
    folder: 'Одежда/Футболки',
    updated: '2026-11-17 12:00:00.000',
    price: 350000,
    composition: `${TEST_NOTE} Хлопок 100%.`,
    chart: TEE_CHART,
    stock: stock(4, 8, 8, 6, 3),
  },
  {
    id: 'b2e1d4f0-0006-4c3a-8f00-0000000000t2',
    article: 'T02',
    name: 'Футболка с накладным карманом',
    folder: 'Одежда/Футболки',
    updated: '2026-11-13 12:00:00.000',
    price: 390000,
    composition: `${TEST_NOTE} Хлопок 100%.`,
    chart: TEE_CHART,
    stock: stock(3, 6, 6, 4, 2),
  },
]

function toProduct(spec: ModelSpec): MsProduct {
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
      { name: 'Обмеры', value: spec.chart },
    ],
  }
}

function toVariants(spec: ModelSpec): MsVariant[] {
  return MOCK_COLORS.flatMap((color, colorIndex) =>
    SIZES.map((size, sizeIndex) => ({
      id: `${spec.id}-v${colorIndex}${sizeIndex}`,
      product: { meta: { href: `${API}/${spec.id}` } },
      characteristics: [
        { name: 'Цвет', value: color },
        { name: 'Размер', value: size },
      ],
      salePrices: [],
      quantity: spec.stockByColor?.[color]?.[size] ?? spec.stock[size] ?? 0,
    })),
  )
}

export function mockAssortment(): MsAssortment {
  return {
    products: MOCK_MODELS.map(toProduct),
    variants: MOCK_MODELS.flatMap(toVariants),
  }
}
