/**
 * The Theoretical Limit at a date, computed on the frontend for the chart.
 *
 * This is an exact port of `backend/src/evaluation.py::theoretical_limit`,
 * which stays authoritative: the backend evaluates Mileage Records with the
 * same formula at fetch time. The operation order of the arithmetic is kept
 * identical (IEEE 754 doubles, same operand sequence), and rounding uses
 * Python's `round()` — half to even — because JavaScript's `Math.round`
 * rounds exact halves up and would diverge from the backend by one km.
 */

/** The Insurance Report fields the calculation reads. */
export interface LimitReport {
  id: number
  date: string
  odometerReading: number
  mileagePerYear: number
}

/** Python `date.replace(year=...)`: adding years to Feb 29 clamps to Feb 28. */
function addYears(iso: string, years: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const nextYear = (year as number) + years
  const clamped = month === 2 && day === 29 && !isLeapYear(nextYear)
  return `${String(nextYear).padStart(4, '0')}-${String(clamped ? 2 : (month as number)).padStart(2, '0')}-${String(clamped ? 28 : (day as number)).padStart(2, '0')}`
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Whole days between two ISO dates (both UTC midnights; exact multiple of 86400000). */
function daysBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 86_400_000)
}

/** Python `_full_years`: how many full years fit between start and end. */
function fullYears(startIso: string, endIso: string): number {
  let years = 0
  while (addYears(startIso, years + 1) <= endIso) years += 1
  return years
}

/**
 * Python `_in_force_report`: the newest report dated on or before the target.
 * Same-date reports tie-break by the highest id, which is the backend's
 * effective rule (its repository orders by date then id) made explicit here
 * so the result is independent of the input order.
 */
export function inForceReport(
  reports: LimitReport[],
  targetDate: string,
): LimitReport | null {
  let chosen: LimitReport | null = null
  for (const report of reports) {
    if (
      report.date <= targetDate &&
      (chosen === null ||
        report.date > chosen.date ||
        (report.date === chosen.date && report.id > chosen.id))
    ) {
      chosen = report
    }
  }
  return chosen
}

/**
 * Python `round()`: half to even (banker's rounding). `Math.round` rounds
 * exact halves up, so an exact `.5` whose rounded value is odd steps down.
 */
export function roundHalfToEven(value: number): number {
  const rounded = Math.round(value)
  const exactHalf = value - Math.floor(value) === 0.5
  return exactHalf && rounded % 2 !== 0 ? rounded - 1 : rounded
}

/**
 * The Theoretical Limit at `targetDate`: the in force report's Odometer
 * Reading plus the prorated share of its annual caps, or `null` before the
 * first report. Calendar-aware: day counts are the actual elapsed days over
 * full calendar years, so leap years and February are prorated by their true
 * length.
 */
export function theoreticalLimit(
  reports: LimitReport[],
  targetDate: string,
): number | null {
  const report = inForceReport(reports, targetDate)
  if (report === null) return null
  if (report.date === targetDate) return report.odometerReading

  const daysSinceReport = daysBetween(report.date, targetDate)
  const years = fullYears(report.date, targetDate)
  const ceilYears = addYears(report.date, years) >= targetDate ? years : years + 1
  const daysInCeilYears = daysBetween(report.date, addYears(report.date, ceilYears))
  const extra = report.mileagePerYear * ceilYears * daysSinceReport / daysInCeilYears
  return roundHalfToEven(report.odometerReading + extra)
}
