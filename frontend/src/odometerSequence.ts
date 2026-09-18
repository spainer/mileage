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

export const formatNumber: (n: number) => string = (n) =>
  new Intl.NumberFormat('de-DE').format(n)

export function validate(
  entries: OdometerEntry[],
  date: string,
  odometerReading: number,
): string | null {
  const bounds = computeBounds(entries, date)
  if (bounds.sameDateValue !== null) {
    if (odometerReading !== bounds.sameDateValue) {
      return `Odometer reading must be ${formatNumber(bounds.sameDateValue)} km.`
    }
    return null
  }
  if (bounds.lower !== null && odometerReading < bounds.lower) {
    return `Odometer reading must be at least ${formatNumber(bounds.lower)} km.`
  }
  if (bounds.upper !== null && odometerReading > bounds.upper) {
    return `Odometer reading must be at most ${formatNumber(bounds.upper)} km.`
  }
  return null
}

export function boundsHint(entries: OdometerEntry[], date: string): string | null {
  const bounds = computeBounds(entries, date)
  if (bounds.sameDateValue !== null) {
    return `Must be ${formatNumber(bounds.sameDateValue)} km.`
  }
  if (bounds.lower !== null && bounds.upper !== null) {
    return `Must be between ${formatNumber(bounds.lower)} and ${formatNumber(bounds.upper)} km.`
  }
  if (bounds.lower !== null) {
    return `Must be at least ${formatNumber(bounds.lower)} km.`
  }
  if (bounds.upper !== null) {
    return `Must be at most ${formatNumber(bounds.upper)} km.`
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
