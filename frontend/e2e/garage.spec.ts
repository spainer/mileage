import { expect, test, type Page } from '@playwright/test'

import { formatDate, formatKm, formatPlate, isoLocalDate, todayIso } from '../src/format'

const BACKEND = 'http://localhost:8000/api'

const READING = 45_678
const ANNUAL_MILEAGE_CAP = 15_000
const OVER_BY = 1_000
const REPORTED_READING = READING - ANNUAL_MILEAGE_CAP - OVER_BY

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

interface EvaluationWire {
  theoretical_limit: number
  delta: number | null
}

async function seedCar(manufacturer: string, model: string, license: string): Promise<void> {
  await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer, model, license }),
  })
}

async function evaluationForLicense(license: string): Promise<EvaluationWire | null> {
  const car = await findCarByLicense(license)
  return (await request(`/cars/${car.id}/evaluation`)) as EvaluationWire | null
}

function cardFor(page: Page, license: string) {
  return page.locator('[role="button"]', { hasText: formatPlate(license) })
}

async function openSlideover(page: Page, license: string) {
  await cardFor(page, license).click()
  return page.getByRole('dialog').filter({ hasText: formatPlate(license) })
}

test.describe('Garage', () => {
  test.describe.configure({ mode: 'serial' })

  let createdLicense = ''
  let recordDate = ''
  let reportDate = ''

  test.beforeAll(async () => {
    await wipeCars()
  })

  test.afterAll(async () => {
    await wipeCars()
  })

  test('loads the wall with data from the backend', async ({ page }) => {
    const license = randomLicense()
    await seedCar('Opel', 'Corsa', license)

    await page.goto('/')

    const card = cardFor(page, license)
    await expect(card).toBeVisible()
    await expect(card).toContainText('Opel Corsa')
    await expect(card.getByTestId('theoretical-limit')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '+ Add car' })).toBeVisible()
  })

  test('adds a car via the add tile, after the validation error paths', async ({ page }) => {
    const duplicateLicense = randomLicense()
    await seedCar('BMW', 'M3', duplicateLicense)

    await page.goto('/')
    await page.getByRole('button', { name: '+ Add car' }).click()
    const modal = page.getByRole('dialog', { name: 'Add car' })
    await expect(modal).toBeVisible()

    await modal.getByLabel('Manufacturer').fill('Toyota')
    await modal.getByLabel('Model').fill('Yaris')
    await modal.getByLabel('License').fill('NOT-A-PLATE')
    await modal.getByRole('button', { name: 'Add car' }).click()
    await expect(modal.locator('[role="alert"]')).toHaveText(
      'License must be a valid German license (e.g. M-AB1234).',
    )

    await modal.getByLabel('License').fill(duplicateLicense)
    await modal.getByRole('button', { name: 'Add car' }).click()
    await expect(modal.locator('[role="alert"]')).toHaveText(
      'A car with this license already exists',
    )

    createdLicense = randomLicense()
    await modal.getByLabel('License').fill(createdLicense)
    await modal.getByRole('button', { name: 'Add car' }).click()

    await expect(modal).toBeHidden()
    const slideover = page.getByRole('dialog').filter({ hasText: formatPlate(createdLicense) })
    await expect(slideover).toBeVisible()
    await expect(slideover).toContainText('Toyota Yaris')
  })

  test('adds a mileage record and an insurance report through the modals', async ({ page }) => {
    await page.goto('/')
    const slideover = await openSlideover(page, createdLicense)
    await expect(slideover).toBeVisible()

    await expect(slideover.getByText('No readings yet')).toBeVisible()
    await slideover.getByRole('button', { name: 'Add reading' }).click()
    const recordModal = page.getByRole('dialog', { name: 'Add reading' })
    await expect(recordModal).toBeVisible()
    recordDate = await recordModal.getByLabel('Date').inputValue()
    await recordModal.getByLabel('Odometer reading (km)').fill(String(READING))
    await recordModal.getByRole('button', { name: 'Add reading' }).click()
    await expect(recordModal).toBeHidden()

    const recordRow = slideover.locator('tbody tr')
    await expect(recordRow).toHaveCount(1)
    await expect(recordRow).toContainText(`${formatKm(READING)} km`)
    await expect(recordRow).toContainText(formatDate(recordDate))
    await expect(recordRow).toContainText('—')

    await slideover.getByRole('tab', { name: 'Insurance' }).click()
    await expect(slideover.getByText('no report yet')).toBeVisible()
    await slideover.getByRole('button', { name: 'Add report' }).click()
    const reportModal = page.getByRole('dialog', { name: 'Add report' })
    await expect(reportModal).toBeVisible()
    await expect(reportModal.getByLabel('Odometer reading (km)')).toHaveValue(String(READING))
    reportDate = oneYearBeforeToday()
    await reportModal.getByLabel('Date').fill(reportDate)
    await reportModal.getByLabel('Odometer reading (km)').fill(String(REPORTED_READING))
    await reportModal.getByLabel('Annual mileage cap (km/year)').fill(String(ANNUAL_MILEAGE_CAP))
    await reportModal.getByRole('button', { name: 'Add report' }).click()
    await expect(reportModal).toBeHidden()

    const reportRow = slideover.locator('tbody tr')
    await expect(reportRow).toHaveCount(1)
    await expect(reportRow).toContainText(formatKm(ANNUAL_MILEAGE_CAP))
    await expect(reportRow).toContainText(formatDate(reportDate))
    await expect(reportRow.getByText('In force')).toBeVisible()
  })

  test('shows the derived Latest and In force values on card and slideover', async ({ page }) => {
    await page.goto('/')
    const slideover = await openSlideover(page, createdLicense)
    await expect(slideover).toBeVisible()

    await expect(
      slideover.getByText(`Latest: ${formatKm(READING)} km on ${formatDate(recordDate)}`),
    ).toBeVisible()

    await slideover.getByRole('tab', { name: 'Insurance' }).click()
    await expect(slideover.getByText(`In force: ${formatKm(ANNUAL_MILEAGE_CAP)} km/year`)).toBeVisible()
    await expect(slideover.locator('tbody tr').getByText('In force')).toBeVisible()

    await page.mouse.click(10, 400)
    await expect(slideover).toBeHidden()

    const card = cardFor(page, createdLicense)
    await expect(card).toBeVisible()
    await expect(card.getByText('Latest')).toBeVisible()
    await expect(card.getByText(`${formatKm(READING)} km`)).toBeVisible()
    await expect(card.getByText(formatDate(recordDate))).toBeVisible()
    await expect(card.getByText(formatKm(ANNUAL_MILEAGE_CAP))).toBeVisible()
    const evaluation = await evaluationForLicense(createdLicense)
    expect(evaluation).not.toBeNull()
    expect(evaluation?.delta).toBeGreaterThan(0)

    const theoreticalLimit = card.getByTestId('theoretical-limit')
    await expect(theoreticalLimit).toHaveText(formatKm(evaluation!.theoretical_limit))
    await expect(theoreticalLimit).toHaveClass(/text-error/)
    await expect(card).toContainText('1 reading')
    await expect(card).toContainText('1 report')
  })

  test('deletes the car from the edit modal after confirmation', async ({ page }) => {
    await page.goto('/')
    const slideover = await openSlideover(page, createdLicense)
    await expect(slideover).toBeVisible()

    await slideover.getByRole('button', { name: 'Edit car' }).click()
    const editModal = page.getByRole('dialog', { name: 'Edit car' })
    await expect(editModal).toBeVisible()
    await expect(editModal.getByLabel('License')).toHaveValue(createdLicense)

    await editModal.getByRole('button', { name: 'Delete' }).click()
    const confirmDialog = page.getByRole('dialog', { name: 'Delete car' })
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText(
      'This deletes Toyota Yaris together with all of its Mileage Records and Insurance Reports.',
    )

    await confirmDialog.getByRole('button', { name: 'Delete' }).click()

    await expect(confirmDialog).toBeHidden()
    await expect(editModal).toBeHidden()
    await expect(slideover).toBeHidden()
    await expect(cardFor(page, createdLicense)).toBeHidden()
  })
})
