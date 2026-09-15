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

export function carLabel(car: Car): string {
  return `${car.manufacturer} ${car.model}`
}
