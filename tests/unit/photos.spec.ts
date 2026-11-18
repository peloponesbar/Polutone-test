import { describe, expect, it } from 'vitest'

import { imagesForColor } from '@/lib/catalog/images'
import { orderModelPhotos, parsePhotoIndex, photoAlt } from '@/lib/catalog/photo-pack'

describe('imagesForColor', () => {
  const images = [
    { id: 1, color: 'Шалфей' },
    { id: 2, color: 'Графит' },
    { id: 3, color: null },
    { id: 4, color: 'Шалфей' },
  ]

  it('keeps photos of the chosen color plus color-less ones, in admin order', () => {
    expect(imagesForColor(images, 'Шалфей').map((i) => i.id)).toEqual([1, 3, 4])
  })

  it('returns everything when no color is chosen', () => {
    expect(imagesForColor(images, null)).toHaveLength(4)
  })

  it("never shows another color's photos", () => {
    expect(imagesForColor([{ id: 1, color: 'Графит' }], 'Шалфей')).toEqual([])
  })
})

const INDEX = [
  '﻿Артикул;Модель;Цвет;HEX;Ракурс;Файл;Ширина;Высота',
  'H01;Худи;Шалфей;#9EA99B;Спереди;H01\\sage\\H01_sage_01_front.png;1122;1402',
  'H01;Худи;Молочный;#F2EFE9;Спереди;H01/milk/H01_milk_01_front.png;1122;1402',
  'H01;Худи;Молочный;#F2EFE9;Сзади;H01/milk/H01_milk_02_back.png;1122;1402',
  '',
].join('\r\n')

describe('parsePhotoIndex', () => {
  it('reads rows, strips the BOM and normalises path separators', () => {
    const rows = parsePhotoIndex(INDEX)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      article: 'H01',
      model: 'Худи',
      color: 'Шалфей',
      view: 'Спереди',
      file: 'H01/sage/H01_sage_01_front.png',
    })
  })

  it('fails loudly on missing columns or incomplete lines', () => {
    expect(() => parsePhotoIndex('Артикул;Модель\nH01;Худи')).toThrow('Цвет, Ракурс, Файл')
    expect(() => parsePhotoIndex('Артикул;Модель;Цвет;Ракурс;Файл\nH01;Худи;;Спереди;a.png')).toThrow('line 2')
  })

  it('returns nothing for an empty file', () => {
    expect(parsePhotoIndex('')).toEqual([])
  })
})

describe('photo ordering and alt text', () => {
  it('orders by the given colors, keeping view order inside a color', () => {
    const ordered = orderModelPhotos(parsePhotoIndex(INDEX), ['Молочный', 'Шалфей'])
    expect(ordered.map((r) => `${r.color}/${r.view}`)).toEqual([
      'Молочный/Спереди',
      'Молочный/Сзади',
      'Шалфей/Спереди',
    ])
  })

  it('describes the garment, color and view', () => {
    expect(photoAlt(parsePhotoIndex(INDEX)[0])).toBe('Худи, цвет «шалфей», спереди')
  })
})
