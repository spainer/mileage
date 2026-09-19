import { expect, test } from '@playwright/test'

test.describe('Fixed viewport', () => {
  test('disables user scaling and adds cover fitting in the viewport meta', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    )
  })

  test('pins the app root to the viewport height and hides page-level overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await expect(page.locator('#app')).toHaveCSS('height', '844px')
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    await page.evaluate(() => window.scrollTo(0, 10_000))
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('scrolls the garage content internally instead of the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 150 })
    await page.goto('/')

    const container = page.locator('#app > div')
    await expect(container).toHaveCSS('overflow-y', 'auto')

    const scrollTop = await container.evaluate((el) => {
      el.scrollTo(0, 10_000)
      return el.scrollTop
    })
    expect(scrollTop).toBeGreaterThan(0)

    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
})
