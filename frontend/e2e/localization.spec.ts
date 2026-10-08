import { expect, test, type Page } from '@playwright/test'

import {
  evaluationLabel,
  formatDate,
  formatKm,
  formatPlate,
  isoLocalDate,
  todayIso,
} from '../src/format'
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

// Extra Mileage Records for the plural-count tests, monotonic so the backend
// accepts them.
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

// Two letters plus three digits satisfies the German License rule, and the
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

// What the interface must say in each language, shared by the tests that run
// in both.
interface LocaleExpectations {
  title: string
  docLang: string
  subtitle: string
  addCar: string
  ariaLabel: string
  singleCounts: string
  pluralCounts: string
  loadFailedTitle: string
  retry: string
}

const EN: LocaleExpectations = {
  title: 'Mileage',
  docLang: 'en',
  subtitle: 'Every car at a glance.',
  addCar: '+ Add car',
  ariaLabel: 'Language',
  singleCounts: '1 reading · 1 report',
  pluralCounts: '3 readings · 2 reports',
  loadFailedTitle: 'Could not load the garage',
  retry: 'Retry',
}

const DE: LocaleExpectations = {
  title: 'Kilometerstand',
  docLang: 'de',
  subtitle: 'Alle Autos auf einen Blick.',
  addCar: '+ Auto hinzufügen',
  ariaLabel: 'Sprache',
  singleCounts: '1 Erfassung · 1 Bericht',
  pluralCounts: '3 Erfassungen · 2 Berichte',
  loadFailedTitle: 'Die Garage konnte nicht geladen werden',
  retry: 'Erneut versuchen',
}

// The document metadata and the selector itself, in the selected language.
async function expectGarageShell(page: Page, ex: LocaleExpectations): Promise<void> {
  await expect(page).toHaveTitle(ex.title)
  await expect(page.locator('html')).toHaveAttribute('lang', ex.docLang)
  await expect(page.getByText(ex.subtitle)).toBeVisible()

  const select = page.getByTestId('language-selector')
  await expect(select).toBeVisible()
  await expect(select).toHaveValue(ex.docLang)
  await expect(select).toHaveAttribute('aria-label', ex.ariaLabel)
  await expect(select.locator('option')).toHaveText(['English', 'Deutsch'])
}

// The seeded car's card, formatted per the selected language.
async function expectFormattedGarage(
  page: Page,
  license: string,
  ex: LocaleExpectations,
): Promise<void> {
  const card = cardFor(page, license)
  await expect(card).toBeVisible()
  await expect(card).toContainText('Volkswagen Golf')
  await expect(card).toContainText(`${formatKm(READING)} km`)
  await expect(card).toContainText(formatDate(todayIso()))
  await expect(card).toContainText(formatKm(ANNUAL_MILEAGE_CAP))
  await expect(card.locator('[data-testid="theoretical-limit"]')).toHaveText(
    formatKm(THEORETICAL_LIMIT),
  )
  await expect(card).toContainText(ex.singleCounts)
  await expect(page.getByRole('button', { name: ex.addCar })).toBeVisible()
}

// The API failure state in the selected language, then recovery after Retry.
async function expectLoadFailureAndRetry(page: Page, ex: LocaleExpectations): Promise<void> {
  await page.route(APP_API, (route) => route.abort())
  await page.goto('/')

  await expect(page.getByText(ex.loadFailedTitle)).toBeVisible()
  const retryButton = page.getByRole('button', { name: ex.retry })
  await expect(retryButton).toBeVisible()

  await page.unroute(APP_API)
  await retryButton.click()
  await expect(page.getByText(ex.subtitle)).toBeVisible()
}

// The seeded values as the app displays them and as the API still serves
// them: presentation localizes, the stored values do not.
async function expectApiValuesLocaleIndependent(
  page: Page,
  license: string,
  carId: number,
): Promise<void> {
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
}

// A fresh visit with this context's browser language: the interface must be
// in the mapped generic language, with the seeded car formatted by it.
async function expectRegionalMapping(
  page: Page,
  license: string,
  ex: LocaleExpectations,
): Promise<void> {
  await page.goto('/')
  await expect(page.getByText(ex.subtitle)).toBeVisible()
  await expect(page.getByTestId('language-selector')).toHaveValue(ex.docLang)
  await expect(cardFor(page, license)).toContainText(`${formatKm(READING)} km`)
}

// What the car details slideover must say in each language: the tabs, the
// formatted summaries and table values, the status labels, the empty states,
// and the accessible names of the actions.
interface CarDetailsExpectations {
  mileageTab: string
  insuranceTab: string
  latest: string
  latestOn: (date: string) => string
  noReadings: string
  noMileage: string
  addReading: string
  editReading: string
  dateHeader: string
  readingHeader: string
  sinceLastHeader: string
  limitHeader: string
  capPerYear: string
  kmPerYear: string
  inForce: string
  noReportYet: string
  noReports: string
  addReport: string
  editReport: string
  editCar: string
  atReading: (km: string) => string
}

const CAR_DETAILS_EN: CarDetailsExpectations = {
  mileageTab: 'Mileage',
  insuranceTab: 'Insurance',
  latest: 'Latest',
  latestOn: (date) => `on ${date}`,
  noReadings: 'No readings yet',
  noMileage: 'No mileage readings yet.',
  addReading: 'Add reading',
  editReading: 'Edit reading',
  dateHeader: 'Date',
  readingHeader: 'Reading',
  sinceLastHeader: 'Since last',
  limitHeader: 'Limit',
  capPerYear: 'Cap / year',
  kmPerYear: 'km/year',
  inForce: 'In force',
  noReportYet: 'no report yet',
  noReports: 'No insurance reports yet.',
  addReport: 'Add report',
  editReport: 'Edit report',
  editCar: 'Edit car',
  atReading: (km) => `at ${km} km`,
}

const CAR_DETAILS_DE: CarDetailsExpectations = {
  mileageTab: 'Erfassungen',
  insuranceTab: 'Versicherung',
  latest: 'Letzter Stand',
  latestOn: (date) => `am ${date}`,
  noReadings: 'Noch keine Erfassungen',
  noMileage: 'Noch keine Erfassungen.',
  addReading: 'Erfassung hinzufügen',
  editReading: 'Erfassung bearbeiten',
  dateHeader: 'Datum',
  readingHeader: 'Erfassung',
  sinceLastHeader: 'Seit letzter',
  limitHeader: 'Limit',
  capPerYear: 'Limit / Jahr',
  kmPerYear: 'km/Jahr',
  inForce: 'In Kraft',
  noReportYet: 'noch kein Bericht',
  noReports: 'Noch keine Berichte.',
  addReport: 'Bericht hinzufügen',
  editReport: 'Bericht bearbeiten',
  editCar: 'Auto bearbeiten',
  atReading: (km) => `bei ${km} km`,
}

// Opens the seeded car's slideover and checks the details surface in the
// selected language: the tabs, the Latest summary and the timeline table with
// its formatted dates and numbers, the In force summary and badge, the mobile
// presentation, and the accessible names of the actions.
async function expectCarDetails(
  page: Page,
  license: string,
  ex: CarDetailsExpectations,
): Promise<void> {
  await cardFor(page, license).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const evaluation = evaluationLabel({ theoreticalLimit: THEORETICAL_LIMIT, delta: OVER_BY })

  await expect(dialog.getByRole('button', { name: ex.editCar })).toBeVisible()
  await expect(dialog.getByRole('tab', { name: ex.mileageTab })).toBeVisible()
  await expect(dialog.getByRole('tab', { name: ex.insuranceTab })).toBeVisible()

  // The mileage tab, active by default: the summary line and the timeline
  // table with its formatted values.
  await expect(
    dialog
      .getByText(`${ex.latest}: ${formatKm(READING)} km ${ex.latestOn(formatDate(todayIso()))}`)
      .first(),
  ).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: ex.dateHeader })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: ex.readingHeader })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: ex.sinceLastHeader })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: ex.limitHeader })).toBeVisible()

  const body = dialog.locator('tbody')
  await expect(body.locator('tr')).toHaveCount(2)
  await expect(body.locator('tr').nth(0)).toContainText(formatDate(todayIso()))
  await expect(body.locator('tr').nth(0)).toContainText(`${formatKm(READING)} km`)
  await expect(body.locator('tr').nth(0)).toContainText(
    `+${formatKm(READING - REPORTED_READING)}`,
  )
  await expect(body.locator('tr').nth(0)).toContainText(evaluation.text)
  await expect(body.locator('tr').nth(1)).toContainText(formatDate(oneYearBeforeToday()))
  await expect(body.locator('tr').nth(1)).toContainText(`${formatKm(REPORTED_READING)} km`)
  await expect(body.locator('tr').nth(1)).toContainText(
    `${formatKm(ANNUAL_MILEAGE_CAP)} ${ex.kmPerYear}`,
  )
  await expect(body.locator('tr').nth(1)).toContainText('—')
  await expect(body.locator('tr').nth(1)).toContainText('+0 km')

  // The mobile presentation of the same values, hidden at this viewport.
  await expect(dialog.locator('div.md\\:hidden')).toContainText(
    `${formatDate(todayIso())} · +${formatKm(READING - REPORTED_READING)} km · ${evaluation.text}`,
  )

  await expect(dialog.getByRole('button', { name: ex.addReading })).toBeVisible()
  await expect(dialog.getByRole('button', { name: ex.editReading }).first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: ex.editReport }).first()).toBeVisible()

  // The insurance tab.
  await dialog.getByRole('tab', { name: ex.insuranceTab }).click()
  await expect(dialog.getByRole('columnheader', { name: ex.capPerYear })).toBeVisible()
  await expect(
    dialog.getByText(`${ex.inForce}: ${formatKm(ANNUAL_MILEAGE_CAP)} ${ex.kmPerYear}`).first(),
  ).toBeVisible()

  const reportBody = dialog.locator('tbody')
  await expect(reportBody.locator('tr')).toHaveCount(1)
  await expect(reportBody.locator('tr')).toContainText(formatDate(oneYearBeforeToday()))
  await expect(reportBody.locator('tr')).toContainText(`${formatKm(REPORTED_READING)} km`)
  await expect(reportBody.locator('tr').getByText(ex.inForce, { exact: true })).toBeVisible()
  await expect(dialog.locator('div.md\\:hidden')).toContainText(
    `${formatDate(oneYearBeforeToday())} · ${ex.atReading(formatKm(REPORTED_READING))}`,
  )

  await expect(dialog.getByRole('button', { name: ex.addReport })).toBeVisible()
  await expect(dialog.getByRole('button', { name: ex.editReport }).first()).toBeVisible()
}

// The slideover of a seeded car without records or reports: the empty states
// and the add actions in the selected language.
async function expectCarDetailsEmptyStates(
  page: Page,
  license: string,
  ex: CarDetailsExpectations,
): Promise<void> {
  await cardFor(page, license).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await expect(dialog.getByText(ex.noReadings, { exact: true })).toBeVisible()
  await expect(dialog.getByText(ex.noMileage, { exact: true }).first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: ex.addReading })).toBeVisible()

  await dialog.getByRole('tab', { name: ex.insuranceTab }).click()
  await expect(dialog.getByText(ex.noReportYet, { exact: true })).toBeVisible()
  await expect(dialog.getByText(ex.noReports, { exact: true }).first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: ex.addReport })).toBeVisible()
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
      await expectGarageShell(page, EN)
      await expectFormattedGarage(page, license, EN)
    })

    test('keeps an explicit choice across reloads and falls back to detection when cleared', async ({
      page,
    }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)
      const card = cardFor(page, license)

      await page.goto('/')
      await expect(page.getByText(EN.subtitle)).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)

      await page.getByTestId('language-selector').selectOption('de')
      setLocale('de')
      await expect(page.getByText(DE.subtitle)).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      expect(await page.evaluate((key) => window.localStorage.getItem(key), LANGUAGE_STORAGE_KEY)).toBe(
        'de',
      )

      await page.reload()
      await expect(page.getByText(DE.subtitle)).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)

      await page.evaluate(
        (key) => window.localStorage.removeItem(key),
        LANGUAGE_STORAGE_KEY,
      )
      setLocale('en')
      await page.reload()
      await expect(page.getByText(EN.subtitle)).toBeVisible()
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
      await expect(page).toHaveTitle(DE.title)
      await expect(page.locator('html')).toHaveAttribute('lang', DE.docLang)
      await expect(page.getByText(DE.subtitle)).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText(DE.singleCounts)
      expect(navigations).toBe(0)

      await page.getByTestId('language-selector').selectOption('en')
      setLocale('en')
      await expect(page.getByText(EN.subtitle)).toBeVisible()
      await expect(card).toContainText(`${formatKm(READING)} km`)
      await expect(card).toContainText(EN.singleCounts)
      expect(navigations).toBe(0)
    })

    test('shows the load failure and retry in English', async ({ page }) => {
      await expectLoadFailureAndRetry(page, EN)
    })

    test('pluralizes the per-car counts in English', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedPluralData(carId)

      await page.goto('/')
      await expect(cardFor(page, license)).toContainText(EN.pluralCounts)
    })

    test('keeps the API values locale-independent', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await expectApiValuesLocaleIndependent(page, license, carId)
    })

    test('keeps the language selector visible while the car slideover is open', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await cardFor(page, license).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      // The modal slideover puts the page in its inert scope while open, so
      // the selector stays visible but is not clickable (tracked in #62).
      await expect(page.getByLabel('Language')).toBeVisible()
    })

    test('shows the car details in English', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expectCarDetails(page, license, CAR_DETAILS_EN)
    })

    test('shows the car details empty states in English', async ({ page }) => {
      const license = randomLicense()
      await seedCar('Volkswagen', 'Golf', license)

      await page.goto('/')
      await expectCarDetailsEmptyStates(page, license, CAR_DETAILS_EN)
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
      await expectGarageShell(page, DE)
      await expectFormattedGarage(page, license, DE)
    })

    test('shows the load failure and retry in German', async ({ page }) => {
      await expectLoadFailureAndRetry(page, DE)
    })

    test('pluralizes the per-car counts in German', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedPluralData(carId)

      await page.goto('/')
      await expect(cardFor(page, license)).toContainText(DE.pluralCounts)
    })

    test('switches to English live and back to German', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expect(page.getByText(DE.subtitle)).toBeVisible()

      await page.getByTestId('language-selector').selectOption('en')
      setLocale('en')
      await expect(page).toHaveTitle(EN.title)
      await expect(page.getByText(EN.subtitle)).toBeVisible()
      await expect(page.getByTestId('language-selector')).toHaveValue('en')

      await page.getByTestId('language-selector').selectOption('de')
      setLocale('de')
      await expect(page).toHaveTitle(DE.title)
      await expect(page.getByText(DE.subtitle)).toBeVisible()
      await expect(page.getByTestId('language-selector')).toHaveValue('de')
    })

    test('keeps the API values locale-independent', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await expectApiValuesLocaleIndependent(page, license, carId)
    })

    test('shows the car details in German', async ({ page }) => {
      const license = randomLicense()
      const carId = await seedCar('Volkswagen', 'Golf', license)
      await seedReadingAndReport(carId)

      await page.goto('/')
      await expectCarDetails(page, license, CAR_DETAILS_DE)
    })

    test('shows the car details empty states in German', async ({ page }) => {
      const license = randomLicense()
      await seedCar('Volkswagen', 'Golf', license)

      await page.goto('/')
      await expectCarDetailsEmptyStates(page, license, CAR_DETAILS_DE)
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

        await expectRegionalMapping(page, license, EN)
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

        await expectRegionalMapping(page, license, DE)
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

        await expectRegionalMapping(page, license, EN)
      })
    })
  })
})
