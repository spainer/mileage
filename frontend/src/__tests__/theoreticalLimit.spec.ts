import { describe, expect, it } from 'vitest'

import { inForceReport, roundHalfToEven, theoreticalLimit, type LimitReport } from '../theoreticalLimit'

function report(id: number, date: string, odometerReading: number, mileagePerYear: number): LimitReport {
  return { id, date, odometerReading, mileagePerYear }
}

// The expected values mirror backend/tests/test_evaluation.py, which pins the
// authoritative Python formula; the additions below pin the JavaScript port
// where it previously diverged from it.

describe('theoreticalLimit', () => {
  it('is null without reports', () => {
    expect(theoreticalLimit([], '2025-01-01')).toBeNull()
  })

  it('is null before the first report', () => {
    const reports = [report(1, '2026-01-15', 1_000, 12_000)]
    expect(theoreticalLimit(reports, '2025-01-01')).toBeNull()
  })

  it('is the Odometer Reading on a report date', () => {
    const reports = [report(1, '2026-01-15', 1_000, 12_000)]
    expect(theoreticalLimit(reports, '2026-01-15')).toBe(1_000)
  })

  it('is the cap times the full years at exact full years', () => {
    const reports = [report(1, '2024-01-15', 1_000, 12_000)]
    expect(theoreticalLimit(reports, '2026-01-15')).toBe(25_000)
  })

  it('prorates a half year by the actual day count in a non-leap year', () => {
    const reports = [report(1, '2025-01-15', 1_000, 12_000)]
    expect(theoreticalLimit(reports, '2025-07-15')).toBe(6_951)
  })

  it('uses the actual day count when crossing a leap year', () => {
    const reports = [report(1, '2024-01-15', 1_000, 12_000)]
    expect(theoreticalLimit(reports, '2025-03-01')).toBe(14_494)
  })

  it('stays flat with a zero annual cap', () => {
    const reports = [report(1, '2024-01-15', 5_000, 0)]
    expect(theoreticalLimit(reports, '2025-06-01')).toBe(5_000)
  })

  it('handles a report on Feb 29 with a zero cap on its own date', () => {
    const reports = [report(1, '2024-02-29', 5_000, 0)]
    expect(theoreticalLimit(reports, '2024-02-29')).toBe(5_000)
  })

  it('clamps Feb 29 to Feb 28 when adding a year', () => {
    // One full clamped year fits: 366 * 1 * 365 / 365 = 366 extra.
    const reports = [report(1, '2024-02-29', 5_000, 366)]
    expect(theoreticalLimit(reports, '2025-02-28')).toBe(5_366)
  })

  it('uses the earlier report between two reports', () => {
    const reports = [
      report(1, '2024-01-15', 1_000, 12_000),
      report(2, '2025-06-01', 20_000, 10_000),
    ]
    expect(theoreticalLimit(reports, '2024-08-01')).toBe(7_525)
  })

  it('uses the second report on its date', () => {
    const reports = [
      report(1, '2024-01-15', 1_000, 12_000),
      report(2, '2025-06-01', 20_000, 10_000),
    ]
    expect(theoreticalLimit(reports, '2025-06-01')).toBe(20_000)
  })

  it('uses the second report after it', () => {
    const reports = [
      report(1, '2024-01-15', 1_000, 12_000),
      report(2, '2025-06-01', 20_000, 10_000),
    ]
    expect(theoreticalLimit(reports, '2025-09-01')).toBe(22_521)
  })

  it('rounds an exact half to the even value, like Python, not up, like Math.round', () => {
    // 2024 is a leap year: the extra is exactly 183/366 = 0.5, so the limit
    // is 182.5. Python round() -> 182 (even); Math.round would give 183.
    const reports = [report(1, '2024-01-15', 182, 183)]
    expect(theoreticalLimit(reports, '2024-01-16')).toBe(182)
    // Two days on: the extra is exactly 1, so 183 with no rounding question.
    expect(theoreticalLimit(reports, '2024-01-17')).toBe(183)
  })
})

describe('inForceReport', () => {
  it('picks the newest report dated on or before the target', () => {
    const reports = [
      report(1, '2024-01-15', 1_000, 12_000),
      report(2, '2025-06-01', 20_000, 10_000),
    ]
    expect(inForceReport(reports, '2025-06-01')?.id).toBe(2)
    expect(inForceReport(reports, '2025-05-31')?.id).toBe(1)
    expect(inForceReport(reports, '2023-12-31')).toBeNull()
  })

  it('tie-breaks same-date reports by the highest id, independent of input order', () => {
    const sorted = [
      report(1, '2025-01-15', 1_000, 12_000),
      report(2, '2025-06-01', 20_000, 8_000),
      report(3, '2025-06-01', 20_000, 10_000),
    ]
    const unsorted = [sorted[2]!, sorted[0]!, sorted[1]!]
    expect(inForceReport(sorted, '2025-06-02')?.id).toBe(3)
    expect(inForceReport(unsorted, '2025-06-02')?.id).toBe(3)
  })

  it('prefers the newer date over a higher id', () => {
    const reports = [
      report(9, '2025-06-01', 20_000, 10_000),
      report(2, '2025-07-01', 21_000, 9_000),
    ]
    expect(inForceReport(reports, '2025-07-01')?.id).toBe(2)
  })
})

describe('roundHalfToEven', () => {
  it('rounds exact halves to the even value', () => {
    expect(roundHalfToEven(0.5)).toBe(0)
    expect(roundHalfToEven(1.5)).toBe(2)
    expect(roundHalfToEven(2.5)).toBe(2)
    expect(roundHalfToEven(3.5)).toBe(4)
  })

  it('rounds non-half values like Math.round', () => {
    expect(roundHalfToEven(2.3)).toBe(2)
    expect(roundHalfToEven(2.7)).toBe(3)
    expect(roundHalfToEven(-1.5)).toBe(-2)
  })
})
