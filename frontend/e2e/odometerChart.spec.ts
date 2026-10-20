import { expect, test, type Locator, type Page } from '@playwright/test'

import { evaluationLabel, formatDate, formatKm } from '../src/format'
import { i18n, setLocale } from '../src/i18n'
import { theoreticalLimit, type LimitReport } from '../src/theoreticalLimit'

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

const oldestDate = daysFromNow(-400)
const secondDate = daysFromNow(-120)
const thirdDate = daysFromNow(-60)
const latestDate = daysFromNow(-1)
const sameDateDay = daysFromNow(-30)

const OLDEST_READING = 84_000
const SECOND_READING = 84_210
const THIRD_READING = 93_400
const LATEST_READING = 101_400
const NEW_READING = 110_000

const CHART_LABEL = 'Odometer readings over time'

// The seeded report as the limit calculation reads it, for the Node-side
// expected values the inspection assertions compute.
const SEED_REPORT: LimitReport = {
  id: 1,
  date: oldestDate,
  odometerReading: OLDEST_READING,
  mileagePerYear: 12_000,
}

/** The chart's effective limit at a date: the seeded report plus extras. */
function limitAt(date: string, extra: LimitReport[] = []): number | null {
  return theoreticalLimit([SEED_REPORT, ...extra], date)
}

/** The point's transparent hit band: the pointer events open the inspection. */
function bandOf(page: Page, date: string, label: string = CHART_LABEL): Locator {
  return page.locator(`svg[aria-label="${label}"] rect[data-date="${date}"]`)
}

function tooltipOf(page: Page): Locator {
  return page.getByRole('tooltip')
}

/** Hovers the point's hit band and returns the shared inspection. */
async function hoverPoint(page: Page, date: string, label: string = CHART_LABEL): Promise<Locator> {
  await bandOf(page, date, label).hover()
  return tooltipOf(page)
}

/**
 * Asserts the shared inspection of the latest reading in the current
 * locale: the Node-side i18n module supplies the localized labels and
 * number/date formatting, so the same assertions serve English and German.
 */
async function expectLatestPointInspected(tooltip: Locator): Promise<void> {
  const latestLimit = limitAt(latestDate)
  expect(latestLimit).not.toBeNull()

  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(formatDate(latestDate))
  await expect(tooltip).toContainText(`${formatKm(LATEST_READING)} km`)
  await expect(tooltip).toContainText(i18n.global.t('car.chart.source.record'))
  await expect(tooltip).toContainText(
    `${i18n.global.t('car.chart.theoretical')}: ${formatKm(latestLimit!)} km`,
  )
  await expect(tooltip).toContainText(
    evaluationLabel({ theoreticalLimit: latestLimit!, delta: LATEST_READING - latestLimit! }).text,
  )
}

let carId = 0
let emptyCarId = 0
let sameDateCarId = 0

async function wipeCars(): Promise<void> {
  const cars = (await request('/cars')) as Array<{ id: number }>
  for (const car of cars) {
    await request(`/cars/${car.id}`, { method: 'DELETE' })
  }
}

async function seed(): Promise<void> {
  // A report plus three records, one per distinct date.
  const car = (await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }),
  })) as { id: number }
  carId = car.id
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: secondDate, odometer_reading: SECOND_READING }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: thirdDate, odometer_reading: THIRD_READING }),
  })
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: latestDate, odometer_reading: LATEST_READING }),
  })
  // The same report the limit calculation reads as SEED_REPORT.
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: SEED_REPORT.date,
      odometer_reading: SEED_REPORT.odometerReading,
      mileage_per_year: SEED_REPORT.mileagePerYear,
    }),
  })

  // No readings of either kind.
  const empty = (await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer: 'Audi', model: 'A3', license: 'M-GC4821' }),
  })) as { id: number }
  emptyCarId = empty.id

  // A record and a report on the same date with the same reading.
  const sameDate = (await request('/cars', {
    method: 'POST',
    body: JSON.stringify({ manufacturer: 'BMW', model: '320', license: 'M-CD5777' }),
  })) as { id: number }
  sameDateCarId = sameDate.id
  await request(`/cars/${sameDateCarId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: sameDateDay, odometer_reading: 50_000 }),
  })
  await request(`/cars/${sameDateCarId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({ date: sameDateDay, odometer_reading: 50_000, mileage_per_year: 10_000 }),
  })
}

async function openSlideover(page: Page, license: string) {
  await page.locator('[role="button"]', { hasText: license }).click()
  return page.getByRole('dialog').filter({ hasText: license })
}

interface ChartGeometry {
  width: number
  containerWidth: number
  /** Marker x positions in DOM order (oldest first). */
  circles: number[]
  /** x of the series path's endpoint; -1 when the series has no line. */
  pathEndX: number
  /** Line segments of the series path. */
  segments: number
  /** Gridline labels, left of the plot. */
  yLabels: string[]
  /** Date labels, below the plot. */
  xLabels: string[]
}

/**
 * Measures the running chart. The rendered width is read against the
 * container's; the marker positions, the series endpoint, and the axis
 * labels are separated by their positions (y labels sit left of the plot,
 * x labels below it). Waits until the responsive width has settled, because
 * the chart renders at a fallback width before its observer fires.
 */
async function chartGeometry(page: Page, label: string = CHART_LABEL): Promise<ChartGeometry> {
  const pending = await page.waitForFunction(
    (label: string) => {
      const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).pop()
      const svg = dialog?.querySelector(`svg[aria-label="${label}"]`) as SVGSVGElement | null
      if (!svg) return null
      const width = Number(svg.getAttribute('width'))
      const containerWidth = svg.parentElement ? svg.parentElement.clientWidth : -1
      if (width !== containerWidth) return null
      const circles = Array.from(svg.querySelectorAll('circle')).map(
        (circle) => Number(circle.getAttribute('cx')),
      )
      const tokens = (svg.querySelector('path')?.getAttribute('d') ?? '').trim().split(' ')
      const pathEndX = tokens.length >= 2 ? Number(tokens[tokens.length - 2]) : -1
      const segments = tokens.filter((token) => token === 'L').length
      const texts = Array.from(svg.querySelectorAll('text'))
      return {
        width,
        containerWidth,
        circles,
        pathEndX,
        segments,
        yLabels: texts
          .filter((text) => Number(text.getAttribute('x')) < 56)
          .map((text) => text.textContent ?? ''),
        xLabels: texts
          .filter((text) => Number(text.getAttribute('y')) > 208)
          .map((text) => text.textContent ?? ''),
      }
    },
    label,
    { timeout: 5000 },
  )
  const geometry = await pending.jsonValue()
  if (!geometry) throw new Error('the odometer chart did not appear')
  return geometry
}

/** The `d` data of every series path in the chart, in DOM order (actual first). */
async function pathData(dialog: ReturnType<typeof openSlideover>): Promise<string[]> {
  return dialog
    .locator(`svg[aria-label="${CHART_LABEL}"]`)
    .locator('path')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? ''))
}

test.beforeEach(async () => {
  await wipeCars()
  await seed()
})

test.afterEach(async () => {
  await wipeCars()
})

// The German tests switch the Node-side i18n module for their expected
// values; reset it for the next file in the worker (the test files share one
// module registry).
test.afterEach(() => {
  setLocale('en')
})

test('shows the combined history above the tabs as a chart fitted to the readings', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()

  await expect(dialog.getByRole('heading', { name: 'Odometer history' })).toBeVisible()
  await expect(dialog.locator(`svg[aria-label="${CHART_LABEL}"]`)).toBeVisible()

  const geometry = await chartGeometry(page)

  // The chart fills its container.
  expect(geometry.width).toBe(geometry.containerWidth)

  // One marker per distinct date, from the left plot edge to the right one.
  expect(geometry.circles).toHaveLength(4)
  expect(geometry.circles[0]).toBeCloseTo(56, 1)
  expect(geometry.circles[3]).toBeCloseTo(geometry.width - 16, 1)

  // Horizontal spacing is proportional to elapsed time, not to the index.
  const t0 = Date.parse(oldestDate)
  const t1 = Date.parse(latestDate)
  const expectedRatio = (Date.parse(secondDate) - t0) / (t1 - t0)
  expect(
    (geometry.circles[1] - geometry.circles[0]) / (geometry.circles[3] - geometry.circles[0]),
  ).toBeCloseTo(expectedRatio, 2)

  // The series connects the markers and stops at the latest reading.
  expect(geometry.segments).toBe(geometry.circles.length - 1)
  expect(geometry.pathEndX).toBeCloseTo(geometry.circles[geometry.circles.length - 1], 1)

  // The vertical axis is fitted to the readings, never forced to zero.
  const yValues = geometry.yLabels.map((label) => Number(label.replace(/[^\d]/g, '')))
  expect(yValues.length).toBeGreaterThan(0)
  expect(yValues.every((value) => value > 0)).toBe(true)
  expect(Math.min(...yValues)).toBeLessThan(LATEST_READING)
  expect(geometry.yLabels).toContain(formatKm(95_000))

  // The dated ends of the history are labelled.
  expect(geometry.xLabels).toContain(formatDate(oldestDate))
  expect(geometry.xLabels).toContain(formatDate(latestDate))

  // The chart sits above the tabs, outside the tab contents.
  const followsTablist = await page.evaluate((label: string) => {
    const dialog = document.querySelector('[role="dialog"]')
    const chart = dialog?.querySelector(`svg[aria-label="${label}"]`)
    const tablist = dialog?.querySelector('[role="tablist"]')
    if (!chart || !tablist) throw new Error('chart or tablist not found')
    return Boolean(chart.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING)
  }, CHART_LABEL)
  expect(followsTablist).toBe(true)
  expect(await dialog.locator(`[role="tabpanel"] svg[aria-label="${CHART_LABEL}"]`).count()).toBe(0)
})

test('fits the slideover on a phone screen and thins the date labels', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()

  // The phone slideover opens over the card that was clicked, so the virtual
  // mouse sits over the chart and its point opens on the appear-hover; a
  // phone has no pointer, so move it away before asserting.
  await page.mouse.move(0, 0)

  const phone = await chartGeometry(page)
  expect(phone.circles).toHaveLength(4)
  expect(phone.width).toBeGreaterThan(0)
  expect(phone.width).toBeLessThan(375)

  // No horizontal overflow: the chart fits the viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  // The two series stay identified on a phone: the legend labels both and
  // fits the viewport.
  await expect(dialog.getByText('Actual odometer reading')).toBeVisible()
  await expect(dialog.getByText('Theoretical limit')).toBeVisible()
  const legend = await dialog.locator('div.flex.items-center.gap-4').boundingBox()
  expect(legend.width).toBeLessThan(375)

  // A wider panel renders a wider chart with more date labels.
  await page.setViewportSize({ width: 1280, height: 720 })
  const desktop = await chartGeometry(page)
  expect(desktop.width).toBeGreaterThan(phone.width)
  expect(desktop.xLabels.length).toBeGreaterThan(phone.xLabels.length)
  expect(phone.xLabels.length).toBeGreaterThanOrEqual(2)
})

test('updates the chart live after a reading is added, without reopening the slideover', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()

  const before = await chartGeometry(page)
  expect(before.circles).toHaveLength(4)

  await dialog.getByRole('button', { name: 'Add reading' }).click()
  const recordModal = page.getByRole('dialog', { name: 'Add reading' })
  await expect(recordModal).toBeVisible()
  await recordModal.getByLabel('Date').fill(daysFromNow(0))
  await recordModal.getByLabel('Odometer reading (km)').fill(String(NEW_READING))
  await recordModal.getByRole('button', { name: 'Add reading' }).click()
  await expect(recordModal).toBeHidden()

  const after = await chartGeometry(page)
  expect(after.circles).toHaveLength(5)
  expect(after.circles[4]).toBeCloseTo(after.width - 16, 1)
  expect(after.xLabels).toContain(formatDate(daysFromNow(0)))
})

test('collapses a same-date record and report into one marker', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - CD 5777')
  await expect(dialog).toBeVisible()

  const geometry = await chartGeometry(page)
  expect(geometry.circles).toHaveLength(1)
  // A single date is centred in the plot, and the series has no line.
  expect(geometry.circles[0]).toBeCloseTo((56 + geometry.width - 16) / 2, 1)
  expect(geometry.segments).toBe(0)
  expect(geometry.pathEndX).toBeCloseTo(geometry.circles[0], 1)
})

test('shows the empty state for a car without readings of either kind', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - GC 4821')
  await expect(dialog).toBeVisible()

  await expect(dialog.getByRole('heading', { name: 'Odometer history' })).toBeVisible()
  await expect(dialog.getByText('No odometer readings yet.')).toBeVisible()
  expect(await dialog.locator(`svg[aria-label="${CHART_LABEL}"]`).count()).toBe(0)
})

test('plots the theoretical limit as a dashed second series with a legend and a reset', async ({
  page,
}) => {
  // A second report mid-history: the outgoing trajectory resets to it.
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: secondDate,
      odometer_reading: SECOND_READING,
      mileage_per_year: 10_000,
    }),
  })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()
  const geometry = await chartGeometry(page)
  const [, limit] = await pathData(dialog)

  // The theoretical path stops at the latest reading, like the actual one.
  const limitTokens = limit.trim().split(' ')
  expect(limitTokens[0]).toBe('M')
  expect(Number(limitTokens[limitTokens.length - 2])).toBeCloseTo(
    geometry.circles[geometry.circles.length - 1],
    1,
  )

  const svg = dialog.locator(`svg[aria-label="${CHART_LABEL}"]`)
  const [actualStroke, limitStroke] = await svg
    .locator('path')
    .evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke))
  expect(limitStroke).not.toBe(actualStroke)

  // The legend above the chart identifies both series.
  await expect(dialog.getByText('Actual odometer reading')).toBeVisible()
  await expect(dialog.getByText('Theoretical limit')).toBeVisible()

  // One dashed vertical reset at the second report's date, where the
  // outgoing trajectory drops to the incoming report's reading.
  const resets = svg.locator('line.stroke-warning')
  expect(await resets.count()).toBe(1)
  const resetX = Number((await resets.first().getAttribute('x1')) ?? 'NaN')
  expect(resetX).toBeCloseTo(geometry.circles[1], 1)
})

test('shows the actual history with a localized hint when no report exists', async ({
  page,
}) => {
  // Give the otherwise-empty car readings, but no insurance report.
  await request(`/cars/${emptyCarId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: secondDate, odometer_reading: 10_000 }),
  })
  await request(`/cars/${emptyCarId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: latestDate, odometer_reading: 12_000 }),
  })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - GC 4821')
  await expect(dialog).toBeVisible()
  await chartGeometry(page)

  const [only] = await pathData(dialog)
  expect(only.trim().split(' ').filter((token) => token === 'L')).toHaveLength(1)
  expect(await dialog.getByText('Add an insurance report to see the theoretical limit.')).toBeVisible()
  await expect(dialog.getByText('Actual odometer reading')).toBeHidden()
  expect(
    await dialog.locator(`svg[aria-label="${CHART_LABEL}"] line.stroke-warning`).count(),
  ).toBe(0)
})

test('re-plots the theoretical limit after the report cap is edited in the dialog', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()
  await chartGeometry(page)
  const before = (await dialog.locator(`svg[aria-label="${CHART_LABEL}"] path`).nth(1).boundingBox())!

  await dialog.getByRole('tab', { name: 'Insurance' }).click()
  await dialog.getByRole('button', { name: 'Edit report' }).click()
  const editModal = page.getByRole('dialog', { name: 'Edit report' })
  await expect(editModal).toBeVisible()
  await editModal.getByLabel('Annual mileage cap (km/year)').fill('15000')
  await editModal.getByRole('button', { name: 'Save' }).click()
  await expect(editModal).toBeHidden()
  await chartGeometry(page)

  const after = (await dialog.locator(`svg[aria-label="${CHART_LABEL}"] path`).nth(1).boundingBox())!
  // The higher cap moves the limit; the chart reflects the edit without a
  // reopen of the slideover, and the in-force summary follows it.
  expect(Math.abs(after.y - before.y) + Math.abs(after.height - before.height)).toBeGreaterThan(5)
  // The full in-force summary is unique (the mobile card shows the badge
  // text separately), so it resolves to the desktop header.
  await expect(dialog.getByText(`In force: ${formatKm(15_000)} km/year`)).toBeVisible()
})

test('plots no theoretical limit before the first insurance report', async ({ page }) => {
  // A reading before the seeded report: the actual series starts there.
  const preReportDate = daysFromNow(-500)
  await request(`/cars/${carId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: preReportDate, odometer_reading: 80_000 }),
  })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await expect(dialog).toBeVisible()
  const geometry = await chartGeometry(page)
  expect(geometry.circles).toHaveLength(5)

  const [actual, limit] = await pathData(dialog)
  const actualStart = Number(actual.trim().split(' ')[1])
  const limitTokens = limit.trim().split(' ')
  const limitStart = Number(limitTokens[1])

  // The actual series starts at the earliest reading; the theoretical series
  // only at the first report's date — not earlier, and not as zero.
  expect(actualStart).toBeCloseTo(geometry.circles[0], 1)
  expect(limitStart).toBeCloseTo(geometry.circles[1], 1)
  expect(limitStart).toBeGreaterThan(actualStart)

  // The pre-report point inspects the same way: the reading and its source,
  // but no limit and no difference, because no trajectory is in force yet.
  const tooltip = await hoverPoint(page, preReportDate)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(formatKm(80_000))
  await expect(tooltip).toContainText('Mileage record')
  await expect(tooltip.getByText('Theoretical limit')).toHaveCount(0)
  await expect(tooltip.getByText(/km over|km under|On limit/)).toHaveCount(0)
})

// --- Point inspection (#66) ------------------------------------------------

test('inspects a point on hover with its date, reading, source, limit, and difference', async ({
  page,
}) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await chartGeometry(page)

  await expect(tooltipOf(page)).toBeHidden()

  // The latest reading: a record over its limit.
  const tooltip = await hoverPoint(page, latestDate)
  await expectLatestPointInspected(tooltip)

  // The report's own date: the oldest point, a report on its limit.
  const oldestLimit = limitAt(oldestDate)
  expect(oldestLimit).toBe(OLDEST_READING)
  await hoverPoint(page, oldestDate)
  await expect(tooltip).toContainText(formatDate(oldestDate))
  await expect(tooltip).toContainText(`${formatKm(OLDEST_READING)} km`)
  await expect(tooltip).toContainText('Insurance report')
  await expect(tooltip).toContainText(`Theoretical limit: ${formatKm(oldestLimit!)} km`)
  await expect(tooltip).toContainText('On limit')

  // Moving off the chart dismisses the inspection.
  await dialog.getByRole('heading', { name: 'Odometer history' }).hover()
  await expect(tooltipOf(page)).toBeHidden()
})

test('keeps the tooltip inside the slideover at the plot edges on phone and desktop', async ({
  page,
}) => {
  const check = async (dialog: Locator) => {
    const frame = (await dialog.boundingBox())!
    for (const date of [oldestDate, latestDate]) {
      await bandOf(page, date).hover()
      const tip = (await tooltipOf(page).boundingBox())!
      expect(tip.x, `tooltip left (${date})`).toBeGreaterThanOrEqual(frame.x - 1)
      expect(tip.y, `tooltip top (${date})`).toBeGreaterThanOrEqual(frame.y - 1)
      expect(tip.x + tip.width, `tooltip right (${date})`).toBeLessThanOrEqual(
        frame.x + frame.width + 1,
      )
      expect(tip.y + tip.height, `tooltip bottom (${date})`).toBeLessThanOrEqual(
        frame.y + frame.height + 1,
      )
    }
  }

  // Phone: the narrowest panel, where the fallback width would overflow.
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  const dialog = await openSlideover(page, 'M - AB 1234')
  await chartGeometry(page)
  await check(dialog)

  // The tooltip is open on the latest point after the check: at 375px every
  // line of it fits on a single line and is readable, not clipped.
  const clippedLines = await page.evaluate(() => {
    const tip = document.querySelector('[role="tooltip"]')
    if (!tip) return -1
    return Array.from(tip.querySelectorAll('p')).filter(
      (line) => line.scrollWidth > line.clientWidth,
    ).length
  })
  expect(clippedLines).toBe(0)

  // Desktop: the plot edges at the wider layout.
  await page.setViewportSize({ width: 1280, height: 720 })
  await chartGeometry(page)
  await check(dialog)
})

test('annotates the new insurance baseline in the inspection at a reset', async ({ page }) => {
  // A second report on the second date: the trajectory resets to it there.
  const resetReport: LimitReport = {
    id: 2,
    date: secondDate,
    odometerReading: SECOND_READING,
    mileagePerYear: 10_000,
  }
  await request(`/cars/${carId}/insurance-reports`, {
    method: 'POST',
    body: JSON.stringify({
      date: secondDate,
      odometer_reading: SECOND_READING,
      mileage_per_year: 10_000,
    }),
  })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  const tooltip = await hoverPoint(page, secondDate)
  await expect(tooltip).toBeVisible()

  // The reset point consolidates a record and the report, so both sources are
  // named; the limit is the incoming report's reading, on its limit.
  const resetLimit = limitAt(secondDate, [resetReport])
  expect(resetLimit).toBe(SECOND_READING)
  await expect(tooltip).toContainText('Mileage record and insurance report')
  await expect(tooltip).toContainText(`Theoretical limit: ${formatKm(resetLimit!)} km`)
  await expect(tooltip).toContainText('On limit')
  await expect(tooltip).toContainText('New insurance baseline')
})

test('shows the reading without a limit in the inspection when no report exists', async ({
  page,
}) => {
  // Give the otherwise-empty car records, but no insurance report.
  await request(`/cars/${emptyCarId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: secondDate, odometer_reading: 10_000 }),
  })
  await request(`/cars/${emptyCarId}/mileage-records`, {
    method: 'POST',
    body: JSON.stringify({ date: latestDate, odometer_reading: 12_000 }),
  })
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - GC 4821')
  await chartGeometry(page)

  const tooltip = await hoverPoint(page, latestDate)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(formatDate(latestDate))
  await expect(tooltip).toContainText(`${formatKm(12_000)} km`)
  await expect(tooltip).toContainText('Mileage record')

  // No limit exists, so the limit and difference rows are absent entirely.
  await expect(tooltip.getByText('Theoretical limit')).toHaveCount(0)
  await expect(tooltip.getByText(/km over|km under|On limit/)).toHaveCount(0)
})

test('inspecting a point never opens a form or changes the data', async ({ page }) => {
  await page.goto('/')

  const dialog = await openSlideover(page, 'M - AB 1234')
  await chartGeometry(page)

  const band = bandOf(page, latestDate)
  await band.hover()
  const tooltip = tooltipOf(page)
  await expect(tooltip).toBeVisible()

  // A click on the point toggles the inspection (it was open from the hover);
  // nothing else happens.
  await band.click()
  await expect(tooltip).toBeHidden()

  // No form opens and the stored history is unchanged.
  await expect(page.getByRole('dialog', { name: 'Add reading' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Edit reading' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Add report' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Edit report' })).toHaveCount(0)
  const after = await chartGeometry(page)
  expect(after.circles).toHaveLength(4)
  const records = (await request(`/cars/${carId}/mileage-records`)) as Array<{ id: number }>
  expect(records).toHaveLength(3)
  const reports = (await request(`/cars/${carId}/insurance-reports`)) as Array<{ id: number }>
  expect(reports).toHaveLength(1)
})

test.describe('touch', () => {
  test.use({ hasTouch: true })

  test('taps a point open and closes it on the second tap', async ({ page }) => {
    await page.goto('/')

    const dialog = await openSlideover(page, 'M - AB 1234')
    await chartGeometry(page)

    const tooltip = tooltipOf(page)
    await expect(tooltip).toBeHidden()

    const band = bandOf(page, thirdDate)
    await band.tap()
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText(formatDate(thirdDate))
    await expect(tooltip).toContainText(`${formatKm(THIRD_READING)} km`)
    await expect(tooltip).toContainText('Mileage record')

    // A second tap on the same point closes the inspection.
    await band.tap()
    await expect(tooltip).toBeHidden()
  })
})

test.describe('German (de-DE browser)', () => {
  test.use({ locale: 'de-DE' })

  // The chart's localized aria-label in the German interface.
  const GERMAN_CHART_LABEL = 'Kilometerstandsverlauf'

  // The Node-side i18n module is shared by the test files in the worker;
  // switch it so the expected values match the browser's locale.
  test.beforeEach(() => {
    setLocale('de')
  })

  test('inspects points with German wording and German number and date formatting', async ({
    page,
  }) => {
    await page.goto('/')

    const dialog = await openSlideover(page, 'M - AB 1234')
    await chartGeometry(page, GERMAN_CHART_LABEL)

    const tooltip = await hoverPoint(page, latestDate, GERMAN_CHART_LABEL)
    await expectLatestPointInspected(tooltip)
  })
})
