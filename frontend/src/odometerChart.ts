import { timelineForCar } from './state'

/** The history types a consolidated reading can come from. */
export type ChartSource = 'record' | 'report'

/**
 * One point of the actual Odometer Reading series: a distinct date and the
 * Odometer Reading observed on it. `sources` remembers which histories
 * produced the point, for point inspection.
 */
export interface ChartPoint {
  date: string
  odometerReading: number
  sources: ChartSource[]
}

/**
 * The Car's combined Mileage Record and Insurance Report history as chart
 * points, oldest first. Readings sharing a date collapse into one point:
 * the app's validation requires same-date readings to agree, so the
 * collapsed point keeps the shared value, and `sources` retains the
 * histories that produced it.
 */
export function chartPointsForCar(carId: number): ChartPoint[] {
  interface Accumulator {
    date: string
    odometerReading: number
    record: boolean
    report: boolean
  }
  const byDate = new Map<string, Accumulator>()
  for (const row of timelineForCar(carId)) {
    const point = byDate.get(row.date)
    if (point) {
      point[row.kind] = true
    } else {
      byDate.set(row.date, {
        date: row.date,
        odometerReading: row.odometerReading,
        record: row.kind === 'record',
        report: row.kind === 'report',
      })
    }
  }
  // Sources are listed in the canonical record-then-report order,
  // independent of the ids that order same-date rows in the timeline.
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, odometerReading, record, report }) => ({
      date,
      odometerReading,
      sources: [
        ...(record ? (['record'] as ChartSource[]) : []),
        ...(report ? (['report'] as ChartSource[]) : []),
      ],
    }))
}

/**
 * The vertical domain of the chart for readings between `min` and `max`:
 * the displayed values plus symmetric padding of 5% of the span, so the
 * axis is fitted to the history rather than always starting at zero. Equal
 * readings (including all zero) get an absolute pad so the range stays
 * valid and the points stay strictly inside the plot area.
 */
export function fitReadingDomain(min: number, max: number): [number, number] {
  const span = max - min
  const pad = span > 0 ? span * 0.05 : Math.max(1, Math.abs(max) * 0.1)
  return [min - pad, max + pad]
}

/**
 * The horizontal gridline values for a domain: ascending multiples of a
 * "nice" step (1, 2, or 5 times a power of ten) chosen so the domain holds
 * roughly `target` ticks. A degenerate domain yields its single value.
 */
export function niceTicks(lo: number, hi: number, target = 5): number[] {
  const span = hi - lo
  if (span <= 0) return [lo]
  const raw = span / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / magnitude
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * magnitude
  const first = Math.ceil(lo / step) * step
  const ticks: number[] = []
  for (let i = first / step; i <= Math.floor(hi / step) + 1e-9; i++) {
    ticks.push(Math.round(i * step * 1e6) / 1e6)
  }
  return ticks
}

/** The rendered chart height in pixels. */
export const CHART_HEIGHT = 240

/** The rendered width when the container cannot be measured. */
export const CHART_FALLBACK_WIDTH = 640

const MARGIN = { top: 16, right: 16, bottom: 32, left: 56 } as const

export interface ChartPlot {
  left: number
  right: number
  top: number
  bottom: number
}

export interface ChartLayout {
  width: number
  height: number
  plot: ChartPlot
  /** Horizontal position of a reading date; true elapsed time on x. */
  x: (date: string) => number
  /** Vertical position of an Odometer Reading; fitted domain with padding. */
  y: (value: number) => number
  /** Gridline values of the vertical axis. */
  yTicks: number[]
  /** The points whose dates are labelled on the horizontal axis. */
  labeled: ChartPoint[]
}

/**
 * Maps a Car's chart points onto pixel coordinates. `points` must be
 * non-empty (the caller renders the empty state otherwise). Dates are
 * parsed as calendar days in UTC, so equal elapsed time gives equal
 * horizontal spacing regardless of the display timezone.
 */
export function computeChartLayout(points: ChartPoint[], width: number): ChartLayout {
  const plot: ChartPlot = {
    left: MARGIN.left,
    right: width - MARGIN.right,
    top: MARGIN.top,
    bottom: CHART_HEIGHT - MARGIN.bottom,
  }

  const times = points.map((point) => Date.parse(point.date))
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const x = (date: string): number => {
    if (t1 === t0) return (plot.left + plot.right) / 2
    return plot.left + ((Date.parse(date) - t0) / (t1 - t0)) * (plot.right - plot.left)
  }

  const readings = points.map((point) => point.odometerReading)
  const [d0, d1] = fitReadingDomain(Math.min(...readings), Math.max(...readings))
  const y = (value: number): number =>
    plot.bottom - ((value - d0) / (d1 - d0)) * (plot.bottom - plot.top)

  return {
    width,
    height: CHART_HEIGHT,
    plot,
    x,
    y,
    yTicks: niceTicks(d0, d1),
    labeled: selectLabeledPoints(
      points,
      labelTarget(plot.right - plot.left),
      points.map((point) => x(point.date)),
    ),
  }
}

/**
 * How many dates to label on the horizontal axis for a given plot width:
 * a date label needs roughly `LABEL_WIDTH` of horizontal room, never more
 * than five, and at least two so a span always shows its ends.
 */
function labelTarget(plotWidth: number): number {
  const LABEL_WIDTH = 90
  const MAX_LABELS = 5
  return Math.min(MAX_LABELS, Math.max(2, Math.floor(plotWidth / LABEL_WIDTH)))
}

/**
 * The horizontal space a date label occupies at most, in the 10px axis
 * font: "MM/DD/YYYY" / "DD.MM.YYYY" in tabular figures. Edge labels are
 * anchored outward, so they reach this far into the plot from their point;
 * interior labels are centred on their point and reach half as far each way.
 */
const LABEL_MAX_WIDTH = 60

/**
 * The points whose dates label the horizontal axis. The candidates are all
 * the points when there are no more than `target` of them, otherwise
 * `target` evenly spaced ones including the first and the last. Candidates
 * are then thinned so no two labels share horizontal space: the first and
 * the last reading are always labelled, and an interior candidate is
 * dropped when its label would overlap an already kept one. That matters
 * because the points sit at time-proportional, not index-proportional,
 * distances, so clustered dates are closer in pixels than in index.
 *
 * `positions` is the x pixel position of each point, in the same order as
 * `points` (ascending date).
 */
function selectLabeledPoints(
  points: ChartPoint[],
  target: number,
  positions: number[],
): ChartPoint[] {
  const n = points.length
  if (n === 0) return []

  const candidates = n <= target
    ? points.map((_, index) => index)
    : Array.from({ length: target }, (_, i) =>
        Math.round((i * (n - 1)) / (target - 1)),
      )
  const interior = [...new Set(candidates)]
    .filter((index) => index > 0 && index < n - 1)
    .sort((a, b) => a - b)

  const interval = (index: number): [number, number] => {
    const x = positions[index]!
    if (index === 0) return [x, x + LABEL_MAX_WIDTH]
    if (index === n - 1) return [x - LABEL_MAX_WIDTH, x]
    return [x - LABEL_MAX_WIDTH / 2, x + LABEL_MAX_WIDTH / 2]
  }

  // The ends are reserved first so interior candidates are checked against
  // them, then added left to right so each is checked against its left
  // neighbour as well.
  const kept: Array<[number, [number, number]]> =
    n === 1 ? [[0, interval(0)]] : [[0, interval(0)], [n - 1, interval(n - 1)]]
  for (const index of interior) {
    const bounds = interval(index)
    const collides = kept.some(([, [kLo, kHi]]) => bounds[0] < kHi && kLo < bounds[1])
    if (!collides) kept.push([index, bounds])
  }
  return kept
    .sort((a, b) => a[0] - b[0])
    .map(([index]) => points[index]!)
}
