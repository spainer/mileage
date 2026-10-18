import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  CHART_HEIGHT,
  chartPointsForCar,
  computeChartLayout,
  fitReadingDomain,
  niceTicks,
} from '../odometerChart'
import type { ChartPoint } from '../odometerChart'
import { insuranceReports, mileageRecords } from '../state'

const CAR_ID = 1
const OTHER_CAR_ID = 2

const OLDEST = '2026-01-15'
const MIDDLE = '2026-04-10'
const NEWEST = '2026-08-30'

beforeEach(() => {
  mileageRecords.value = [
    // Newest-first, as the tables hold it: the chart must re-sort ascending.
    { id: 11, carId: CAR_ID, date: NEWEST, odometerReading: 45_678, evaluation: null },
    { id: 12, carId: CAR_ID, date: MIDDLE, odometerReading: 41_000, evaluation: null },
  ]
  insuranceReports.value = [
    { id: 21, carId: CAR_ID, date: OLDEST, odometerReading: 30_000, mileagePerYear: 15_000 },
  ]
})

afterEach(() => {
  mileageRecords.value = []
  insuranceReports.value = []
})

describe('chartPointsForCar', () => {
  it('combines Mileage Records and Insurance Reports into one chronological history', () => {
    const points = chartPointsForCar(CAR_ID)
    expect(points.map((point) => point.date)).toEqual([OLDEST, MIDDLE, NEWEST])
    expect(points.map((point) => point.odometerReading)).toEqual([30_000, 41_000, 45_678])
  })

  it('tags each point with the source histories that produced it', () => {
    const points = chartPointsForCar(CAR_ID)
    expect(points[0]?.sources).toEqual(['report'])
    expect(points[1]?.sources).toEqual(['record'])
    expect(points[2]?.sources).toEqual(['record'])
  })

  it('collapses same-date readings into one point, retaining both sources', () => {
    // Validation requires same-date readings to agree, so the collapsed
    // point keeps the shared value.
    mileageRecords.value = [
      ...mileageRecords.value,
      { id: 13, carId: CAR_ID, date: OLDEST, odometerReading: 30_000, evaluation: null },
    ]
    const points = chartPointsForCar(CAR_ID)
    expect(points).toHaveLength(3)
    expect(points[0]).toEqual({
      date: OLDEST,
      odometerReading: 30_000,
      sources: ['record', 'report'],
    })
    // The other dates are untouched.
    expect(points.slice(1).map((point) => point.date)).toEqual([MIDDLE, NEWEST])
  })

  it('shows only the requested Car\'s history', () => {
    mileageRecords.value = [
      ...mileageRecords.value,
      { id: 31, carId: OTHER_CAR_ID, date: MIDDLE, odometerReading: 100_000, evaluation: null },
    ]
    insuranceReports.value = [
      ...insuranceReports.value,
      { id: 32, carId: OTHER_CAR_ID, date: NEWEST, odometerReading: 200_000, mileagePerYear: 1 },
    ]
    const points = chartPointsForCar(CAR_ID)
    expect(points.map((point) => point.date)).toEqual([OLDEST, MIDDLE, NEWEST])
  })

  it('works with a records-only or a reports-only history', () => {
    const allRecords = [...mileageRecords.value]
    mileageRecords.value = []
    const reportPoints = chartPointsForCar(CAR_ID)
    expect(reportPoints.map((point) => point.sources)).toEqual([['report']])

    mileageRecords.value = allRecords
    insuranceReports.value = []
    const recordPoints = chartPointsForCar(CAR_ID)
    expect(recordPoints.map((point) => point.sources)).toEqual([['record'], ['record']])
  })

  it('returns no points for a Car without readings of either kind', () => {
    mileageRecords.value = []
    insuranceReports.value = []
    expect(chartPointsForCar(CAR_ID)).toEqual([])
  })
})

describe('fitReadingDomain', () => {
  it('fits the displayed values with symmetric padding instead of starting at zero', () => {
    const [lo, hi] = fitReadingDomain(30_000, 45_678)
    expect(lo).toBeLessThan(30_000)
    expect(hi).toBeGreaterThan(45_678)
    expect(lo).toBeGreaterThan(0)
    // The padding is a fixed share of the span, not an absolute amount.
    expect(30_000 - lo).toBeCloseTo(15_678 * 0.05, 6)
    expect(hi - 45_678).toBeCloseTo(15_678 * 0.05, 6)
  })

  it('keeps a valid range for equal readings', () => {
    const [lo, hi] = fitReadingDomain(45_678, 45_678)
    expect(Number.isFinite(lo) && Number.isFinite(hi)).toBe(true)
    expect(lo).toBeLessThan(45_678)
    expect(hi).toBeGreaterThan(45_678)
  })

  it('keeps a valid range for zero readings', () => {
    const [lo, hi] = fitReadingDomain(0, 0)
    expect(lo).toBeLessThan(0)
    expect(hi).toBeGreaterThan(0)
  })
})

describe('niceTicks', () => {
  it('returns a few ascending ticks inside the domain, spaced by a nice step', () => {
    const lo = 29_216.1
    const hi = 46_461.9
    const ticks = niceTicks(lo, hi)
    expect(ticks.length).toBeGreaterThanOrEqual(2)
    expect(ticks.length).toBeLessThanOrEqual(7)
    for (let i = 0; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThanOrEqual(lo)
      expect(ticks[i]).toBeLessThanOrEqual(hi)
      if (i > 0) expect(ticks[i]).toBeGreaterThan(ticks[i - 1])
    }
    const step = ticks[1] - ticks[0]
    const norm = step / 10 ** Math.floor(Math.log10(step))
    expect([1, 2, 5]).toContain(Math.round(norm * 100) / 100)
  })

  it('includes zero for a zero-reading domain', () => {
    expect(niceTicks(-1, 1)).toContain(0)
  })

  it('returns a single tick for a degenerate domain', () => {
    const ticks = niceTicks(5, 5)
    expect(ticks).toEqual([5])
  })
})

const BASE = Date.UTC(2026, 0, 1)
const day = (offset: number): string =>
  new Date(BASE + offset * 86_400_000).toISOString().slice(0, 10)

function point(date: string, odometerReading: number): ChartPoint {
  return { date, odometerReading, sources: ['record'] }
}

describe('computeChartLayout', () => {
  it('spaces points proportionally to elapsed time', () => {
    const points = [point(day(0), 10_000), point(day(30), 20_000), point(day(60), 30_000)]
    const layout = computeChartLayout(points, 640)
    const [x0, x1, x2] = points.map((p) => layout.x(p.date))
    expect(x0).toBeLessThan(x1)
    expect(x1).toBeLessThan(x2)
    // Equal elapsed time gives equal horizontal spacing.
    expect(x1 - x0).toBeCloseTo(x2 - x1, 6)
    // The extremes sit at the plot edges.
    expect(x0).toBeCloseTo(layout.plot.left, 6)
    expect(x2).toBeCloseTo(layout.plot.right, 6)
  })

  it('keeps a single distinct date inside the plot, not at an invalid edge', () => {
    const points = [point(day(10), 20_000)]
    const layout = computeChartLayout(points, 640)
    const middle = (layout.plot.left + layout.plot.right) / 2
    expect(layout.x(points[0]!.date)).toBeCloseTo(middle, 6)
  })

  it('maps higher readings to higher positions and keeps them inside the plot', () => {
    const points = [point(day(0), 30_000), point(day(30), 45_678)]
    const layout = computeChartLayout(points, 640)
    const yLow = layout.y(30_000)
    const yHigh = layout.y(45_678)
    expect(yHigh).toBeLessThan(yLow)
    expect(yHigh).toBeGreaterThan(layout.plot.top)
    expect(yLow).toBeLessThan(layout.plot.bottom)
    // The mapping is linear: the midpoint value lands on the midpoint.
    expect(layout.y((30_000 + 45_678) / 2)).toBeCloseTo((yLow + yHigh) / 2, 6)
  })

  it('keeps the vertical range valid for flat and zero readings', () => {
    for (const value of [45_678, 0]) {
      const layout = computeChartLayout([point(day(0), value), point(day(10), value)], 640)
      expect(Number.isFinite(layout.y(value))).toBe(true)
      expect(layout.y(value)).toBeGreaterThan(layout.plot.top)
      expect(layout.y(value)).toBeLessThan(layout.plot.bottom)
      expect(layout.yTicks.length).toBeGreaterThan(0)
      for (const tick of layout.yTicks) {
        expect(Number.isFinite(tick)).toBe(true)
      }
    }
  })

  it('limits the dated x labels to a handful, keeping the first and last reading', () => {
    const points = [1, 5, 9, 13, 17, 21].map((offset) => point(day(offset), 1_000 + offset))
    const layout = computeChartLayout(points, 640)
    expect(layout.labeled.length).toBeLessThanOrEqual(5)
    expect(layout.labeled[0]).toBe(points[0])
    expect(layout.labeled[layout.labeled.length - 1]).toBe(points[5])

    const few = [point(day(1), 1), point(day(2), 2)]
    expect(computeChartLayout(few, 640).labeled).toEqual(few)
  })

  it('labels fewer dates on a narrow width so they stay readable', () => {
    const points = [1, 5, 9, 13, 17, 21].map((offset) => point(day(offset), 1_000 + offset))
    const wide = computeChartLayout(points, 640).labeled
    const narrow = computeChartLayout(points, 390).labeled
    expect(wide).toHaveLength(5)
    expect(narrow.length).toBeLessThan(wide.length)
    expect(narrow.length).toBeGreaterThanOrEqual(2)
    expect(narrow[0]).toBe(points[0])
    expect(narrow[narrow.length - 1]).toBe(points[5])
  })

  it('drops a label that would overlap its neighbour when dates cluster in time', () => {
    // The two newest readings are 30 days apart at the right plot edge,
    // close enough in pixels for two date labels to collide.
    const points = [
      point(day(0), 1_000),
      point(day(180), 2_000),
      point(day(210), 3_000),
      point(day(240), 4_000),
    ]
    const layout = computeChartLayout(points, 477)
    expect(layout.labeled).toHaveLength(3)
    expect(layout.labeled[0]).toBe(points[0])
    expect(layout.labeled[layout.labeled.length - 1]).toBe(points[3])
    // The interior candidate nearest the last reading is the one dropped.
    expect(layout.labeled.map((p) => p.date)).not.toContain(points[2]?.date)
  })

  it('keeps only the labelled ends when no interior label fits beside the last reading', () => {
    const points = [
      point(day(0), 1_000),
      point(day(180), 2_000),
      point(day(210), 3_000),
      point(day(240), 4_000),
    ]
    const layout = computeChartLayout(points, 343)
    expect(layout.labeled).toHaveLength(2)
    expect(layout.labeled[0]).toBe(points[0])
    expect(layout.labeled[1]).toBe(points[3])
  })

  it('keeps an interior label clear of the end-anchored label of the last reading', () => {
    // The last two readings are a day apart: the end-anchored label of the
    // last reading reaches left across the interior candidate's label.
    const points = [point(day(0), 1), point(day(100), 2), point(day(101), 3)]
    const layout = computeChartLayout(points, 640)
    expect(layout.labeled.map((p) => p.date)).toEqual([points[0]?.date, points[2]?.date])
  })

  it('lays out inside the given width and the fixed height', () => {
    const layout = computeChartLayout([point(day(0), 1), point(day(10), 2)], 390)
    expect(layout.width).toBe(390)
    expect(layout.height).toBe(CHART_HEIGHT)
    expect(layout.plot.right).toBeLessThan(390)
    expect(layout.plot.bottom).toBeLessThan(CHART_HEIGHT)
  })
})
