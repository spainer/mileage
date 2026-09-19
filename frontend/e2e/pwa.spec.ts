import { expect, test } from '@playwright/test'

const DARK_SURFACE = '#020617'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose?: string
}

interface Manifest {
  name: string
  short_name: string
  start_url: string
  display: string
  background_color: string
  theme_color: string
  icons: ManifestIcon[]
}

test.describe('PWA', () => {
  test('links the web app manifest from the document head', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  })

  test('exposes the iOS home-screen meta tags', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', DARK_SURFACE)
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
    await expect(
      page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
    ).toHaveAttribute('content', 'black-translucent')
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Mileage')
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')
  })

  test('serves a standalone dark manifest with any and maskable icons', async ({ page, request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.status()).toBe(200)
    const manifest = (await response.json()) as Manifest
    expect(manifest.name).toBe('Mileage')
    expect(manifest.short_name).toBe('Mileage')
    expect(manifest.display).toBe('standalone')
    expect(manifest.background_color).toBe(DARK_SURFACE)
    expect(manifest.theme_color).toBe(DARK_SURFACE)
    const icons = manifest.icons
    expect(icons.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512', '512x512'])
    expect(icons.some((icon) => icon.purpose === 'any')).toBe(true)
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    for (const icon of icons) {
      const iconResponse = await request.get(icon.src)
      expect(iconResponse.status()).toBe(200)
      expect(iconResponse.headers()['content-type']).toContain('image/png')
    }
  })
})
