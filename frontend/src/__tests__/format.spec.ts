import { describe, expect, it } from 'vitest'

import { carLabel, formatDate, formatKm, todayIso } from '../format'

describe('formatDate', () => {
  it('formats an ISO date as a de-DE short date', () => {
    expect(formatDate('2026-08-30')).toBe('30.08.2026')
  })

  it('zero-pads single-digit months and days', () => {
    expect(formatDate('2026-01-05')).toBe('05.01.2026')
  })
})

describe('formatKm', () => {
  it('groups thousands with the de-DE separator', () => {
    expect(formatKm(101400)).toBe('101.400')
  })

  it('leaves values below 1000 untouched', () => {
    expect(formatKm(42)).toBe('42')
  })
})

describe('carLabel', () => {
  it('joins manufacturer and model with a space', () => {
    const label = carLabel({ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' })
    expect(label).toBe('Volkswagen Golf')
  })
})

describe('todayIso', () => {
  it('returns the local date as an ISO date', () => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    expect(todayIso()).toBe(`${now.getFullYear()}-${month}-${day}`)
  })
})
