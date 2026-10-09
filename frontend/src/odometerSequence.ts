import { i18n } from './i18n'
import { formatKm } from './format'

export interface OdometerEntry {
  id: number
  date: string
  odometerReading: number
}

export interface OdometerBounds {
  lower: number | null
  upper: number | null
  sameDateValue: number | null
}

export function computeBounds(entries: OdometerEntry[], date: string): OdometerBounds {
  let lower: number | null = null
  let upper: number | null = null
  let sameDateValue: number | null = null

  for (const entry of entries) {
    if (entry.date < date) {
      lower = lower === null ? entry.odometerReading : Math.max(lower, entry.odometerReading)
    } else if (entry.date > date) {
      upper = upper === null ? entry.odometerReading : Math.min(upper, entry.odometerReading)
    } else {
      sameDateValue = entry.odometerReading
    }
  }

  return { lower, upper, sameDateValue }
}

export function validate(
  entries: OdometerEntry[],
  date: string,
  odometerReading: number,
): string | null {
  const t = i18n.global.t
  const bounds = computeBounds(entries, date)
  if (bounds.sameDateValue !== null) {
    if (odometerReading !== bounds.sameDateValue) {
      return t('odometer.sameDate', { km: formatKm(bounds.sameDateValue) })
    }
    return null
  }
  if (bounds.lower !== null && odometerReading < bounds.lower) {
    return t('odometer.atLeast', { km: formatKm(bounds.lower) })
  }
  if (bounds.upper !== null && odometerReading > bounds.upper) {
    return t('odometer.atMost', { km: formatKm(bounds.upper) })
  }
  return null
}

export function boundsHint(entries: OdometerEntry[], date: string): string | null {
  const t = i18n.global.t
  const bounds = computeBounds(entries, date)
  if (bounds.sameDateValue !== null) {
    return t('odometer.hintSameDate', { km: formatKm(bounds.sameDateValue) })
  }
  if (bounds.lower !== null && bounds.upper !== null) {
    return t('odometer.hintBetween', {
      lower: formatKm(bounds.lower),
      upper: formatKm(bounds.upper),
    })
  }
  if (bounds.lower !== null) {
    return t('odometer.hintAtLeast', { km: formatKm(bounds.lower) })
  }
  if (bounds.upper !== null) {
    return t('odometer.hintAtMost', { km: formatKm(bounds.upper) })
  }
  return null
}

export function fieldError(
  entries: OdometerEntry[],
  date: string,
  odometerReading: number,
): string | null {
  return validate(entries, date, odometerReading)
}
