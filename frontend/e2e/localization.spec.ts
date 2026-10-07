import { expect, test, type Page } from '@playwright/test'

import { formatDate, formatKm, formatPlate, isoLocalDate, todayIso } from '../src/format'
import { setLocale } from '../src/i18n'
import { LANGUAGE_STORAGE_KEY } from '../src/i18n/language'

// The expected values are computed on the Node side with the same locale as
// the browser context of each describe, so the Node-side i18n module is
// switched in the describe's beforeEach (the test files share one module
// registry, so the file-level afterEach resets it for the next file).
const BACKEND = 'http://localhost:8000/api'

// The root-level /api endpoints the app calls. A `**/api/**` glob would also
// match the Vite source module `…/src/api/client.ts` and break the app's
// own module loading.
const APP_API = 'http://localhost:5173/api/**'

const READING = 45_678
const ANNUAL_MILEAGE_CAP = 15_000
const OVER_BY = 1_000
const REPORTED_READING = READING - ANNUAL_MILEAGE_CAP - OVER_BY
const THEORETICAL_LIMIT = READING - OVER_BY

// Extra entries for the plural-count tests, monotonic so the backend accepts
// them.
const FIRST_EXTRA_READING = 40_000
const SECOND_EXTRA_READING = 43_000
const SECOND_REPORT_READING = 38_000
const SECOND_REPORT_CAP = 16_000

function daysAgoIso(days: number): string {
  const date = new Date(`${todayIso()}T00:00:00`)
  date.setDate(date.getDate() - days)
  return isoLocalDate(date)
}

function monthsAgoIso(months: number): string {
  const date = new Date(`${todayIso()}T00:00:00`)
  date.setMonth(date.getMonth() - months)
  return isoLocalDate(date)
}

function oneYearBeforeToday(): string {
  const date = new Date(`${todayIso()}T00:00:00`)
  date.setFullYear(date.getFullYear() - 1)
  return isoLocalDate(date)
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${BACKEND}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status} ${await response.text()}`)
  }
  if (response.status === 204) return null
  return response.json()
}

// Two letters plus three digits satisfies the German plate rule, and the
// fixed length keeps random licenses from being substrings of each other.
function randomLicense(): string {
  const letters =
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const digits = String(100 + Math.floor(Math.random() * 900))
  return `M-${letters}${digits}`
}

async function findCarByLicense(license: string): Promise<{ id: number; license: string }> {
  const cars = (await request('/cars')) as Array<{ id: number; license: string }>
  const car = cars.find((candidate) => candidate.license === license)
  if (!car) throw new Error(`Car ${license} not found`)
  return car
}

async function wipeCars(): Promise<void> {
  const cars = (await request('/cars')) as Array<{ id: number }>
  for (const car of cars) {
    await request(`/cars/${car.id}`, { method: 'DELETE' })
  }
}

async function seedCar(manufacturer: string, model: string, license: string): Promise<number> {
  await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer, model, license }),
  })
  return (await findCarByLicense(license)).id
}

async function seedReadingAndReport(carId: number): Promise<void> {
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: todayIso(), odometer_reading: READING }),
  })
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: oneYearBeforeToday(),
      odometer_reading: REPORTED_READING,
      mileage_per_year: ANNUAL_MILEAGE_CAP,
    }),
  })
}

async function seedPluralData(carId: number): Promise<void> {
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: daysAgoIso(2), odometer_reading: FIRST_EXTRA_READING }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: daysAgoIso(1), odometer_reading: SECOND_EXTRA_READING }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: todayIso(), odometer_reading: READING }),
  })
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: oneYearBeforeToday(),
      odometer_reading: REPORTED_READING,
      mileage_per_year: ANNUAL_MILEAGE_CAP,
    }),
  })
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: monthsAgoIso(3),
      odometer_reading: SECOND_REPORT_READING,
      mileage_per_year: SECOND_REPORT_CAP,
    }),
  })
}

function cardFor(page: Page, license: string) {
  return page.locator('[role="button"]', { hasText: formatPlate(license) })
}

test.describe('Localization', () => {
  test.afterEach(() => {
    setLocale('en')
  })

  test.describe('English (en-US browser)', () => {
    test.use({ locale: 'en-US' })

    test.beforeEach(() => {
      setLocale('en')
    })

    test.beforeAll(async () => {
      await wipeCars()
    })

    test.afterAll(async () => {
      await wipeCars()
    })

    test('starts in English and formats the garage with English conventions', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(page).toHaveTitle('Mileage')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.getByText('Every car at a glance.')).toBeVisible()

      const card = cardFor(page, license)
      await expect(card).toBeVisible()
      await expect(card).toContainText('Volkswagen Golf')
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText(formatDate(todayIso()))
      await expect(card).toContainText(formatKm(ANNUAL_MILEAGE_CAP))
      await expect(card.locator('[data-testid="theoretical-limit"]')).toHaveText(
        formatKm(THEORETICAL_LIMIT),
      )
      await expect(card).toContainText('1 reading · 1 report')
      await expect(page.getByRole('button', { name: '+ Add car' })).toBeVisible()

      const select = page.getByTestId('language-selector')
      await expect(select).toBeVisible()
      await expect(select).toHaveValue('en')
      await expect(select).toHaveAttribute('aria-label', 'Language')
      await expect(select.locator('option')).toHaveText(['English', 'Deutsch'])
    })

    test('keeps an explicit choice across reloads and falls back to detection when cleared', async ({
      page,
    }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)
      const card = cardFor(page, license)

      await page.goto('/')
      await expect(page.getByText('Every car at a glance.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)

      await page.getByTestId('language-selector').selectOption('de')
      setLocale('de')
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      expect(await page.evaluate((key) => window.localStorage.getItem(key), LANGUAGE_STORAGE_KEY)).toBe(
        'de',
      )

      await page.reload()
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)

      await page.evaluate(
        (key) => window.localStorage.removeItem(key),
        LANGUAGE_STORAGE_KEY,
      )
      setLocale('en')
      await page.reload()
      await expect(page.getByText('Every car at a glance.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
    })

    test('switches languages live without a reload', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)
      const card = cardFor(page, license)

      let navigations = 0
      page.on('framenavigated', () => {
        navigations += 1
      })

      await page.goto('/')
      await expect(card).toBeVisible()
      navigations = 0

      await page.getByTestId('language-selector').selectOption('de')
      setLocale('de')
      await expect(page).toHaveTitle('Kilometerstand')
      await expect(page.locator('html')).toHaveAttribute('lang', 'de')
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText('1 Erfassung · 1 Bericht')
      expect(navigations).toBe(0)

      await page.getByTestId('language-selector').selectOption('en')
      setLocale('en')
      await expect(page.getByText('Every car at a glance.')).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText('1 reading · 1 report')
      expect(navigations).toBe(0)
    })

    test('shows the load failure and retry in English', async ({ page }) => {
      await page.route(APP_API, (route) => route.abort())
      await page.goto('/')

      await expect(page.getByText('Could not load the garage')).toBeVisible()
      const retryButton = page.getByRole('button', { name: 'Retry' })
      await expect(retryButton).toBeVisible()

      await page.unroute(APP_API)
      await retryButton.click()
      await expect(page.getByText('Every car at a glance.')).toBeVisible()
    })

    test('pluralizes the per-car counts in English', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedPluralData(carId)

      await page.goto('/')
      const card = cardFor(page, license)
      await expect(card).toContainText('3 readings · 2 reports')
    })

    test('keeps the API values locale-independent', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)

      const records = (await request(`/cars/${carId}/mileage-records`)) as Array<{
        date: string
        odometer_reading: number
      }>
      expect(records).toHaveLength(1)
      expect(records[0].date).toBe(todayIso())
      expect(records[0].odometer_reading).toBe(READING)

      const reports = (await request(`/cars/${carId}/insurance-reports`)) as Array<{
        date: string
        odometer_reading: number
        mileage_per_year: number
      }>
      expect(reports).toHaveLength(1)
      expect(reports[0]).toMatchObject({
        date: oneYearBeforeToday(),
        odometer_reading: REPORTED_READING,
        mileage_per_year: ANNUAL_MILEAGE_CAP,
      })

      const evaluation = (await request(`/cars/${carId}/evaluation`)) as {
        theoretical_limit: number
        delta: number | null
      }
      expect(evaluation).toEqual({ theoretical_limit: THEORETICAL_LIMIT, delta: OVER_BY })
    })

    test('keeps the language selector visible while the car slideover is open', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await cardFor(page, license).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByLabel('Language')).toBeVisible()
    })
  })

  test.describe('German (de-DE browser)', () => {
    test.use({ locale: 'de-DE' })

    test.beforeEach(() => {
      setLocale('de')
    })

    test.beforeAll(async () => {
      await wipeCars()
    })

    test.afterAll(async () => {
      await wipeCars()
    })

    test('starts in German and formats the garage with German conventions', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(page).toHaveTitle('Kilometerstand')
      await expect(page.locator('html')).toHaveAttribute('lang', 'de')
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()

      const card = cardFor(page, license)
      await expect(card).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText(formatDate(todayIso()))
      await expect(card).toContainText(formatKm(ANNUAL_MILEAGE_CAP))
      await expect(card.locator('[data-testid="theoretical-limit"]')).toHaveText(
        formatKm(THEORETICAL_LIMIT),
      )
      await expect(card).toContainText('1 Erfassung · 1 Bericht')
      await expect(page.getByRole('button', { name: '+ Auto hinzufügen' })).toBeVisible()

      const select = page.getByTestId('language-selector')
      await expect(select).toBeVisible()
      await expect(select).toHaveValue('de')
      await expect(select).toHaveAttribute('aria-label', 'Sprache')
      await expect(select.locator('option')).toHaveText(['English', 'Deutsch'])
    })

    test('shows the load failure and retry in German', async ({ page }) => {
      await page.route(APP_API, (route) => route.abort())
      await page.goto('/')

      await expect(page.getByText('Die Garage konnte nicht geladen werden')).toBeVisible()
      const retryButton = page.getByRole('button', { name: 'Erneut versuchen' })
      await expect(retryButton).toBeVisible()

      await page.unroute(APP_API)
      await retryButton.click()
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
    })

    test('pluralizes the per-car counts in German', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedPluralData(carId)

      await page.goto('/')
      const card = cardFor(page, license)
      await expect(card).toContainText('3 Erfassungen · 2 Berichte')
    })

    test('switches to English live and back to German', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()

      await page.getByTestId('language-selector').selectOption('en')
      setLocale('en')
      await expect(page).toHaveTitle('Mileage')
      await expect(page.getByText('Every car at a glance.')).toBeVisible()
      await expect(page.getByTestId('language-selector')).toHaveValue('en')

      await page.getByTestId('language-selector').selectOption('de')
      setLocale('de')
      await expect(page).toHaveTitle('Kilometerstand')
      await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
      await expect(page.getByTestId('language-selector')).toHaveValue('de')
    })

    test('keeps the API values locale-independent', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)

      const records = (await request(`/cars/${carId}/mileage-records`)) as Array<{
        date: string
        odometer_reading: number
      }>
      expect(records).toHaveLength(1)
      expect(records[0].date).toBe(todayIso())
      expect(records[0].odometer_reading).toBe(READING)

      const reports = (await request(`/cars/${carId}/insurance-reports`)) as Array<{
        date: string
        odometer_reading: number
        mileage_per_year: number
      }>
      expect(reports).toHaveLength(1)
      expect(reports[0]).toMatchObject({
        date: oneYearBeforeToday(),
        odometer_reading: REPORTED_READING,
        mileage_per_year: ANNUAL_MILEAGE_CAP,
      })
    })
  })

  test.describe('Regional browser languages', () => {
    test.describe('en-GB', () => {
      test.use({ locale: 'en-GB' })

      test.beforeEach(() => {
        setLocale('en')
      })

      test('maps an English regional tag to English', async ({ page }) => {
        const license = randomLicense()
        const carId = await seedCar('Volkswagen', 'Golf', license)
        await seedReadingAndReport(carId)

        await page.goto('/')
        await expect(page.getByText('Every car at a glance.')).toBeVisible()
        await expect(page.getByTestId('language-selector')).toHaveValue('en')
        await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)
      })
    })

    test.describe('de-AT', () => {
      test.use({ locale: 'de-AT' })

      test.beforeEach(() => {
        setLocale('de')
      })

      test('maps a German regional tag to German', async ({ page }) => {
        const license = randomLicense()
        const carId = await seedCar('Volkswagen', 'Golf', license)
        await seedReadingAndReport(carId)

        await page.goto('/')
        await expect(page.getByText('Alle Autos auf einen Blick.')).toBeVisible()
        await expect(page.getByTestId('language-selector')).toHaveValue('de')
        await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)
      })
    })

    test.describe('fr-FR', () => {
      test.use({ locale: 'fr-FR' })

      test.beforeEach(() => {
        setLocale('en')
      })

      test('falls back to English for an unsupported language', async ({ page }) => {
        const license = randomLicense()
        const carId = await seedCar('Volkswagen', 'Golf', license)
        await seedReadingAndReport(carId)

        await page.goto('/')
        await expect(page.getByText('Every car at a glance.')).toBeVisible()
        await expect(page.getByTestId('language-selector')).toHaveValue('en')
        await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)
      })
    })
  })
})
