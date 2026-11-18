import { expect, test } from '@playwright/test'

import { seedPublishedCatalog } from '../helpers/catalog'

const HOODIE = '/catalog/hudi-pulover-s-karmanom-kenguru'

test.describe('Catalog → product', () => {
  test.beforeAll(async () => {
    await seedPublishedCatalog()
  })

  test('home page shows the hero, categories and new items', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Выразительность')
    await expect(page.getByRole('heading', { name: 'Категории' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Коллекция 01' })).toBeVisible()
    await page.getByRole('link', { name: 'Смотреть коллекцию' }).click()
    await expect(page).toHaveURL(/\/catalog$/)
  })

  test('filters by category and opens a product', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { level: 1, name: 'Каталог' })).toBeVisible()
    await expect(page.getByRole('status').first()).toHaveText('6 изделий')

    await page.getByRole('navigation', { name: 'Категории' }).getByRole('link', { name: 'Брюки' }).click()
    await expect(page).toHaveURL(/category=bryuki/)
    await expect(page.getByRole('status').first()).toHaveText('2 изделия')

    await page.getByRole('link', { name: 'Прямые брюки с передним швом' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Прямые брюки с передним швом' })).toBeVisible()
  })

  test('sorting by price keeps the category', async ({ page }) => {
    await page.goto('/catalog?category=bryuki')
    await page.getByLabel('Сортировка').selectOption('price-asc')
    await expect(page).toHaveURL(/category=bryuki/)
    await expect(page).toHaveURL(/sort=price-asc/)
  })

  test('size selection follows availability of the chosen color', async ({ page }) => {
    await page.goto(HOODIE)
    const sizes = page.getByRole('radiogroup', { name: 'Размер' })

    await page.getByRole('button', { name: 'В корзину' }).click()
    await expect(page.getByText('Выберите, пожалуйста, размер.')).toBeVisible()

    // «Пыльная роза» has no XS in the test data.
    await page.getByRole('button', { name: 'Пыльная роза' }).click()
    await expect(sizes.getByRole('radio', { name: 'XS, нет в наличии' })).toBeVisible()

    await sizes.getByRole('radio', { name: 'M', exact: true }).click()
    await expect(sizes.getByRole('radio', { name: 'M', exact: true })).toHaveAttribute('aria-checked', 'true')

    // Unavailable sizes are aria-disabled; a forced click must not change the selection.
    await sizes.getByRole('radio', { name: 'XS, нет в наличии' }).click({ force: true })
    await expect(sizes.getByRole('radio', { name: 'M', exact: true })).toHaveAttribute('aria-checked', 'true')
  })

  test('size chart link opens the sizes section', async ({ page }) => {
    await page.goto(HOODIE)
    await page.getByRole('link', { name: 'Таблица размеров' }).click()
    await expect(page.locator('#razmery')).toHaveAttribute('open', '')
    await expect(page.getByRole('table')).toContainText('Ширина по груди, см')
  })

  test('unpublished or unknown products return 404', async ({ page }) => {
    const response = await page.goto('/catalog/takogo-net')
    expect(response?.status()).toBe(404)
  })
})
