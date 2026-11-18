import { expect, test } from '@playwright/test'

import { seedPublishedCatalog } from '../helpers/catalog'

test.describe('Catalog → product', () => {
  test.beforeAll(async () => {
    await seedPublishedCatalog()
  })

  test('filters by category and opens a product', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { level: 1, name: 'Каталог' })).toBeVisible()
    await expect(page.getByRole('status').first()).toHaveText('8 изделий')

    await page.getByRole('navigation', { name: 'Категории' }).getByRole('link', { name: 'Брюки' }).click()
    await expect(page).toHaveURL(/category=bryuki/)
    await expect(page.getByRole('status').first()).toHaveText('2 изделия')
    await expect(page.getByRole('link', { name: 'Брюки широкие' })).toBeVisible()
    await expect(page.getByText('Нет в наличии')).toBeVisible()

    await page.getByRole('link', { name: 'Брюки широкие' }).click()
    await expect(page).toHaveURL(/\/catalog\/bryuki-shirokie$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Брюки широкие' })).toBeVisible()
  })

  test('sorting by price keeps the category', async ({ page }) => {
    await page.goto('/catalog?category=bryuki')
    await page.getByLabel('Сортировка').selectOption('price-asc')
    await expect(page).toHaveURL(/category=bryuki/)
    await expect(page).toHaveURL(/sort=price-asc/)
  })

  test('size selection follows availability of the chosen color', async ({ page }) => {
    await page.goto('/catalog/zhaket-pryamoy')
    const sizes = page.getByRole('radiogroup', { name: 'Размер' })

    await page.getByRole('button', { name: 'В корзину' }).click()
    await expect(page.getByText('Выберите, пожалуйста, размер.')).toBeVisible()

    await page.getByRole('button', { name: 'Камень' }).click()
    await expect(sizes.getByRole('radio', { name: 'XS, нет в наличии' })).toBeVisible()

    await sizes.getByRole('radio', { name: 'M', exact: true }).click()
    await expect(sizes.getByRole('radio', { name: 'M', exact: true })).toHaveAttribute('aria-checked', 'true')

    // Unavailable sizes are aria-disabled; a forced click must not change the selection.
    await sizes.getByRole('radio', { name: 'XS, нет в наличии' }).click({ force: true })
    await expect(sizes.getByRole('radio', { name: 'M', exact: true })).toHaveAttribute('aria-checked', 'true')
  })

  test('size chart link opens the sizes section', async ({ page }) => {
    await page.goto('/catalog/zhaket-pryamoy')
    await page.getByRole('link', { name: 'Таблица размеров' }).click()
    await expect(page.locator('#razmery')).toHaveAttribute('open', '')
    await expect(page.getByRole('table')).toContainText('Ширина по груди, см')
  })

  test('unpublished or unknown products return 404', async ({ page }) => {
    const response = await page.goto('/catalog/takogo-net')
    expect(response?.status()).toBe(404)
  })
})
