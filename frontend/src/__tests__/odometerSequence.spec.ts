import { describe, expect, it } from 'vitest'

import {
  boundsHint,
  computeBounds,
  fieldError,
  formatNumber,
  validate,
  type OdometerEntry,
} from '../odometerSequence'

const mk = (id: number, date: string, odometerReading: number): OdometerEntry => ({
  id,
  date,
  odometerReading,
})

describe('computeBounds', () => {
  it('returns trivial bounds for an empty set', () => {
    expect(computeBounds([], '2026-01-15')).toEqual({
      lower: null,
      upper: null,
      sameDateValue: null,
    })
  })

  it('classifies entries into prior / later / same-date', () => {
    const entries = [
      mk(1, '2025-06-01', 500),
      mk(2, '2025-12-31', 1000),
      mk(3, '2026-06-01', 3000),
      mk(4, '2026-06-01', 4000),
    ]
    expect(computeBounds(entries, '2026-01-15')).toEqual({
      lower: 1000,
      upper: 3000,
      sameDateValue: null,
    })
  })

  it('picks the same-date value when one exists', () => {
    const entries = [
      mk(1, '2026-01-15', 1500),
      mk(2, '2026-06-01', 2000),
    ]
    expect(computeBounds(entries, '2026-01-15')).toEqual({
      lower: null,
      upper: 2000,
      sameDateValue: 1500,
    })
  })

  it('takes the max of prior entries', () => {
    const entries = [
      mk(1, '2025-06-01', 100),
      mk(2, '2025-12-31', 9999),
      mk(3, '2025-12-30', 500),
    ]
    expect(computeBounds(entries, '2026-01-15').lower).toBe(9999)
  })

  it('takes the min of later entries', () => {
    const entries = [
      mk(1, '2026-06-01', 100),
      mk(2, '2026-12-31', 9999),
      mk(3, '2026-07-15', 500),
    ]
    expect(computeBounds(entries, '2026-01-15').upper).toBe(100)
  })
})

describe('validate', () => {
  it('returns null when there are no constraints', () => {
    expect(validate([], '2026-01-15', 0)).toBeNull()
    expect(validate([], '2026-01-15', 99999)).toBeNull()
  })

  it('returns null for proposed >= all prior entries', () => {
    const entries = [mk(1, '2025-06-01', 1000)]
    expect(validate(entries, '2026-01-15', 1000)).toBeNull()
    expect(validate(entries, '2026-01-15', 1001)).toBeNull()
  })

  it('reports when below the prior bound', () => {
    const entries = [mk(1, '2025-06-01', 1000)]
    expect(validate(entries, '2026-01-15', 999)).toBe(
      'Odometer reading must be at least 1.000 km.',
    )
  })

  it('returns null for proposed <= all later entries', () => {
    const entries = [mk(1, '2026-06-01', 2000)]
    expect(validate(entries, '2026-01-15', 2000)).toBeNull()
    expect(validate(entries, '2026-01-15', 1999)).toBeNull()
  })

  it('reports when above the later bound', () => {
    const entries = [mk(1, '2026-06-01', 2000)]
    expect(validate(entries, '2026-01-15', 2001)).toBe(
      'Odometer reading must be at most 2.000 km.',
    )
  })

  it('same-date mismatch is reported with that exact reading', () => {
    const entries = [mk(1, '2026-01-15', 1500)]
    expect(validate(entries, '2026-01-15', 1500)).toBeNull()
    expect(validate(entries, '2026-01-15', 1501)).toBe(
      'Odometer reading must be 1.500 km.',
    )
  })

  it('honours multiple bounds simultaneously', () => {
    const entries = [
      mk(1, '2025-06-01', 1000),
      mk(2, '2026-06-01', 3000),
    ]
    expect(validate(entries, '2026-01-15', 500)).toBe(
      'Odometer reading must be at least 1.000 km.',
    )
    expect(validate(entries, '2026-01-15', 5000)).toBe(
      'Odometer reading must be at most 3.000 km.',
    )
    expect(validate(entries, '2026-01-15', 2000)).toBeNull()
  })

  it('same-date wins over lower / upper', () => {
    const entries = [
      mk(1, '2025-06-01', 500),
      mk(2, '2026-01-15', 1500),
      mk(3, '2026-06-01', 5000),
    ]
    expect(validate(entries, '2026-01-15', 2000)).toBe(
      'Odometer reading must be 1.500 km.',
    )
  })

  it('formatNumber uses thousands-separated de-DE output', () => {
    expect(formatNumber(1000)).toBe('1.000')
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('boundsHint', () => {
  it('returns null when there are no constraints', () => {
    expect(boundsHint([], '2026-01-15')).toBeNull()
  })

  it('returns "must be X km" for a same-date constraint', () => {
    expect(boundsHint([mk(1, '2026-01-15', 1500)], '2026-01-15')).toBe(
      'Must be 1.500 km.',
    )
  })

  it('returns "between X and Y km" when both bounds exist', () => {
    expect(
      boundsHint(
        [mk(1, '2025-06-01', 1000), mk(2, '2026-06-01', 3000)],
        '2026-01-15',
      ),
    ).toBe('Must be between 1.000 and 3.000 km.')
  })

  it('returns "at least X km" when only lower is set', () => {
    expect(boundsHint([mk(1, '2025-06-01', 1000)], '2026-01-15')).toBe(
      'Must be at least 1.000 km.',
    )
  })

  it('returns "at most X km" when only upper is set', () => {
    expect(boundsHint([mk(1, '2026-06-01', 2000)], '2026-01-15')).toBe(
      'Must be at most 2.000 km.',
    )
  })

  it('returns "between X and X km" when lower equals upper', () => {
    expect(
      boundsHint(
        [mk(1, '2025-06-01', 1500), mk(2, '2026-06-01', 1500)],
        '2026-01-15',
      ),
    ).toBe('Must be between 1.500 and 1.500 km.')
  })
})

describe('fieldError', () => {
  it('agrees with validate for non-trivial cases', () => {
    const entries = [
      mk(1, '2025-06-01', 1000),
      mk(2, '2026-06-01', 3000),
    ]
    expect(fieldError(entries, '2026-01-15', 500)).toBe(validate(entries, '2026-01-15', 500))
    expect(fieldError(entries, '2026-01-15', 5000)).toBe(
      validate(entries, '2026-01-15', 5000),
    )
    expect(fieldError(entries, '2026-01-15', 2000)).toBeNull()
  })
})
