import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('home page renders in Russian with the brand heading', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/POLUTONE/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.locator('h1')).toContainText('Выразительность')
    await expect(page.getByRole('link', { name: 'POLUTONE — на главную' })).toBeVisible()
  })
})
