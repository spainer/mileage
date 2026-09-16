import type { Car } from './types'

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatKm(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value)
}

export function formatPlate(license: string): string {
  return license.replace(/-/g, ' - ').replace(/(?<=[A-Za-z])(?=\d)/g, ' ')
}

export function carLabel(car: Car): string {
  return `${car.manufacturer} ${car.model}`
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

const LICENSE_PATTERN =
  /^[A-Z]{1,3}-(?:[A-Z]\d{1,4}[A-Z]?|[A-Z]{2}\d{1,3}[A-Z]?|[A-Z]{2}\d{4})$/

export function normalizeLicense(value: string): string {
  return value.toUpperCase().replace(/ /g, '')
}

export function isValidLicense(value: string): boolean {
  return LICENSE_PATTERN.test(normalizeLicense(value))
}
