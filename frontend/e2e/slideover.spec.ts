import { expect, test, type Page } from '@playwright/test'

import { evaluationLabel, formatDate, formatKm } from '../src/format'
import { evaluationToneClasses } from '../src/theme'
import type { EvaluationLabel } from '../src/types'

const BACKEND = 'http://localhost:8000/api'

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

function daysFromNow(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const firstDate = daysFromNow(-60)
const secondDate = daysFromNow(-30)
const latestDate = daysFromNow(-1)
const inForceDate = daysFromNow(-400)
const futureDate = daysFromNow(30)

let carId = 0
let emptyCarId = 0

async function wipeCars(): Promise<void> {
  const cars = (await request('/cars')) as Array<{ id: number }>
  for (const car of cars) {
    await request(`/cars/${car.id}`, { method: 'DELETE' })
  }
}

async function seed(): Promise<void> {
  const car = (await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }),
  })) as { id: number }
  carId = car.id
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: firstDate, odometer_reading: 84210 }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: secondDate, odometer_reading: 93400 }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: latestDate, odometer_reading: 101400 }),
  })
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({ date: inForceDate, odometer_reading: 84000, mileage_per_year: 12000 }),
  })
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({ date: futureDate, odometer_reading: 110000, mileage_per_year: 9999 }),
  })

  const empty = (await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer: 'Audi', model: 'A3', license: 'M-GC4821' }),
  })) as { id: number }
  emptyCarId = empty.id
}

async function openSlideover(page: Page, plate: string) {
  await page.locator('[role="button"]', { hasText: plate }).click()
  return page.getByRole('dialog')
}

interface WireMileageRecord {
  id: number
  car_id: number
  date: string
  odometer_reading: number
  evaluation: { theoretical_limit: number; delta: number } | null
}

async function expectedEvaluationLabels(): Promise<EvaluationLabel[]> {
  const records = (await request(`/cars/${carId}/mileage-records`)) as WireMileageRecord[]
  const newestFirst = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  return newestFirst.map((record) =>
    evaluationLabel(
      record.evaluation
        ? { theoreticalLimit: record.evaluation.theoretical_limit, delta: record.evaluation.delta }
        : null,
    ),
  )
}

test.beforeEach(async () => {
  await wipeCars()
  await seed()
})

test.afterEach(async () => {
  await wipeCars()
})

test('clicking a card opens the slideover with the plate as title and the car label as description', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')

  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('M - AB 1234')).toBeVisible()
  await expect(dialog.getByText('Volkswagen Golf')).toBeVisible()
})

test('opening a card pushes the car\'s URL', async ({ page }) => {
  await page.goto('/')

  await page.locator('[role="button"]', { hasText: 'M - AB 1234' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(`/cars/${carId}`)
})

test('lists the merged timeline newest first with the Latest summary and Since last deltas', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')

  await expect(dialog.getByText(`Latest: ${formatKm(110000)} km on ${formatDate(futureDate)}`).first()).toBeVisible()

  const body = dialog.locator('tbody')
  await expect(body.locator('tr')).toHaveCount(5)
  await expect(body.locator('tr').nth(0)).toContainText(formatDate(futureDate))
  await expect(body.locator('tr').nth(0)).toContainText(`${formatKm(110000)} km`)
  await expect(body.locator('tr').nth(0)).toContainText(`+${formatKm(8600)}`)
  await expect(body.locator('tr').nth(0)).toContainText(`${formatKm(9999)} km/year`)
  await expect(body.locator('tr').nth(1)).toContainText(`${formatKm(101400)} km`)
  await expect(body.locator('tr').nth(1)).toContainText(`+${formatKm(8000)}`)
  await expect(body.locator('tr').nth(2)).toContainText(`${formatKm(93400)} km`)
  await expect(body.locator('tr').nth(2)).toContainText(`+${formatKm(9190)}`)
  await expect(body.locator('tr').nth(3)).toContainText(`${formatKm(84210)} km`)
  await expect(body.locator('tr').nth(3)).toContainText(`+${formatKm(210)}`)
  await expect(body.locator('tr').nth(4)).toContainText(formatDate(inForceDate))
  await expect(body.locator('tr').nth(4)).toContainText(`${formatKm(84000)} km`)
  await expect(body.locator('tr').nth(4)).toContainText(`${formatKm(12000)} km/year`)
  await expect(body.locator('tr').nth(4)).toContainText('—')
})

test('shows the per-row limit in a right-aligned Limit column on desktop', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  const labels = await expectedEvaluationLabels()

  await expect(dialog.getByRole('columnheader', { name: 'Limit' })).toBeVisible()

  const body = dialog.locator('tbody')
  for (let index = 0; index < 5; index += 1) {
    const cell = body.locator('tr').nth(index).locator('td').nth(3)
    await expect(cell).toHaveClass(/text-right/)
    const span = cell.locator('span')
    if (index === 0 || index === 4) {
      await expect(span).toHaveText('+0 km')
      await expect(span).toHaveClass(/text-muted/)
    } else {
      const label = labels[index - 1]
      await expect(span).toHaveText(label.text)
      await expect(span).toHaveClass(new RegExp(evaluationToneClasses[label.tone]))
    }
  }
})

test('lists the insurance reports newest first with the In force summary and badge', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await dialog.getByRole('tab', { name: 'Insurance' }).click()

  await expect(dialog.getByText(`In force: ${formatKm(12000)} km/year`).first()).toBeVisible()

  const body = dialog.locator('tbody')
  await expect(body.locator('tr')).toHaveCount(2)
  const futureRow = body.locator('tr').nth(0)
  const inForceRow = body.locator('tr').nth(1)
  await expect(futureRow).toContainText(formatKm(9999))
  await expect(futureRow).not.toContainText('In force')
  await expect(inForceRow).toContainText(formatKm(12000))
  await expect(inForceRow.getByText('In force')).toBeVisible()
})

test('shows the empty states for a car without records or reports', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - GC 4821')

  await expect(dialog.getByText('No readings yet')).toBeVisible()
  await expect(dialog.getByText('No mileage readings yet.').first()).toBeVisible()

  await dialog.getByRole('tab', { name: 'Insurance' }).click()
  await expect(dialog.getByText('no report yet')).toBeVisible()
  await expect(dialog.getByText('No insurance reports yet.').first()).toBeVisible()
})

test('renders the lists as tables on desktop', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')

  await expect(dialog.getByRole('table')).toBeVisible()
  await expect(dialog.locator('table')).toBeVisible()
})

test('renders the lists as card lists on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')

  await expect(dialog.locator('table')).toBeHidden()
  const mileageCards = dialog.locator('div.md\\:hidden')
  const labels = await expectedEvaluationLabels()
  await expect(mileageCards.getByText(`${formatKm(101400)} km`)).toBeVisible()
  await expect(
    mileageCards.getByText(`${formatDate(latestDate)} · +${formatKm(8000)} km · ${labels[0].text}`),
  ).toBeVisible()
  await expect(
    mileageCards.getByText(`${formatDate(firstDate)} · +${formatKm(210)} km · ${labels[2].text}`),
  ).toBeVisible()
  await expect(mileageCards.getByText(`${formatKm(9999)} km/year`)).toBeVisible()
  await expect(
    mileageCards.getByText(`${formatDate(futureDate)} · +${formatKm(8600)} km · +0 km`),
  ).toBeVisible()
  await expect(mileageCards.getByText(`${formatDate(inForceDate)} · — · +0 km`)).toBeVisible()

  await dialog.getByRole('tab', { name: 'Insurance' }).click()
  await expect(dialog.locator('table')).toBeHidden()
  const insuranceCards = dialog.locator('div.md\\:hidden')
  await expect(insuranceCards.getByText(`${formatKm(12000)} km/year`)).toBeVisible()
  await expect(insuranceCards.getByText('In force')).toBeVisible()
})

test('closes with Escape and returns to the garage address', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(page).toHaveURL(`/cars/${carId}`)

  await page.waitForFunction(() => {
    const d = document.querySelector('[role="dialog"]')
    return !!d && d.contains(document.activeElement)
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL('/')
})

test('closes with a backdrop click and returns to the garage address', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(page).toHaveURL(`/cars/${carId}`)

  await page.mouse.click(100, 400)
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL('/')
})

test('native browser back closes the slideover and returns to the garage', async ({ page }) => {
  await page.goto('/')
  await openSlideover(page, 'M - AB 1234')
  await expect(page).toHaveURL(`/cars/${carId}`)

  await page.goBack()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL('/')
})

test('a deep link to a known car opens the slideover', async ({ page }) => {
  await page.goto(`/cars/${carId}`)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('M - AB 1234')).toBeVisible()
})

test('a deep link to an unknown car shows the garage with the slideover closed', async ({ page }) => {
  await page.goto('/cars/999999')

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('[role="button"]', { hasText: 'M - AB 1234' })).toBeVisible()
  await expect(page.locator('[role="button"]', { hasText: 'M - GC 4821' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add car' })).toBeVisible()
})