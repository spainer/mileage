import { test, expect } from '@playwright/test'

test('visits the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Mileage Tracker')
  await expect(page.locator('.home p')).toHaveText('Welcome to the mileage tracker.')
})

test('Get Started button triggers alert', async ({ page }) => {
  await page.goto('/')
  page.on('dialog', dialog => dialog.accept())
  const button = page.locator('button')
  await button.click()
  await expect(page.locator('h1')).toHaveText('Mileage Tracker')
})