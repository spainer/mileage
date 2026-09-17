import { expect, test, type Page } from '@playwright/test'

// Tailwind's blue-400 — the prototype's accent for solid primary buttons and
// input focus rings in dark mode.
const BLUE_ACCENT = 'oklch(70.7% 0.165 254.624)'

// --ui-bg set by the theme bootstrap on load: the dark slate surface (slate-950).
const DARK_SURFACE = '#020617'

// Computed styles serialize colors in a browser-specific form, so resolve the
// expected color through the same pipeline by measuring a scratch element.
async function renderedColor(page: Page, cssColor: string): Promise<string> {
  return page.evaluate((color) => {
    const probe = document.createElement('div')
    probe.style.backgroundColor = color
    document.body.appendChild(probe)
    const rendered = getComputedStyle(probe).backgroundColor
    probe.remove()
    return rendered
  }, cssColor)
}

test.describe('Theme', () => {
  test('applies the dark slate surface on load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      await renderedColor(page, DARK_SURFACE),
    )
  })

  test('renders primary buttons and input focus in the prototype blue', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Add car' }).click()
    const modal = page.getByRole('dialog', { name: 'Add car' })
    await expect(modal).toBeVisible()

    const blue = await renderedColor(page, BLUE_ACCENT)
    await expect(modal.getByRole('button', { name: 'Add car' })).toHaveCSS(
      'background-color',
      blue,
    )

    const license = modal.getByLabel('License')
    await license.focus()
    expect(await license.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(blue)
  })
})
