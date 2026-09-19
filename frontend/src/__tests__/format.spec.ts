import { describe, expect, it } from 'vitest'

import {
  carLabel,
  evaluationLabel,
  formatDate,
  formatKm,
  formatPlate,
  isValidLicense,
  normalizeLicense,
  todayIso,
} from '../format'
import type { Evaluation, TodayEvaluation } from '../types'

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

describe('formatPlate', () => {
  it('spaces the dash and separates letters from digits', () => {
    expect(formatPlate('M-AB1234')).toBe('M - AB 1234')
  })

  it('supports three-letter classes', () => {
    expect(formatPlate('B-XYZ123')).toBe('B - XYZ 123')
  })

  it('supports single-letter classes', () => {
    expect(formatPlate('A-A123')).toBe('A - A 123')
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

describe('normalizeLicense', () => {
  it('uppercases the value', () => {
    expect(normalizeLicense('m-ab 1234')).toBe('M-AB1234')
  })

  it('removes spaces', () => {
    expect(normalizeLicense('M - AB 1234')).toBe('M-AB1234')
  })

  it('leaves an already canonical license untouched', () => {
    expect(normalizeLicense('M-AB1234')).toBe('M-AB1234')
  })
})

describe('isValidLicense', () => {
  it.each([
    'M-AB1234',
    'M-A1',
    'M-A1234',
    'M-AB123',
    'M-AB123C',
    'B-XY 123',
    'mn-ab 1234',
  ])('accepts the valid license %s', (license) => {
    expect(isValidLicense(license)).toBe(true)
  })

  it.each([
    '',
    'M',
    'MAB1234',
    'M-1234',
    'M-AB',
    'M-ABC1234',
    'M-AB12345',
    'M--AB1234',
    'M-ABC 123',
    'M-AB1234C',
  ])('rejects the invalid license %s', (license) => {
    expect(isValidLicense(license)).toBe(false)
  })
})

describe('evaluationLabel', () => {
  function evaluation(delta: number | null): TodayEvaluation {
    return { theoreticalLimit: 1000, delta }
  }

  it('renders a missing evaluation as a neutral dash', () => {
    expect(evaluationLabel(null)).toEqual({ text: '—', tone: 'none' })
    expect(evaluationLabel(undefined)).toEqual({ text: '—', tone: 'none' })
  })

  it('renders a positive delta as an over label', () => {
    expect(evaluationLabel(evaluation(500))).toEqual({ text: '500 km over', tone: 'over' })
  })

  it('formats a four-digit over label with the German thousand separator', () => {
    expect(evaluationLabel(evaluation(1500))).toEqual({ text: '1.500 km over', tone: 'over' })
  })

  it('renders a negative delta as an under label', () => {
    expect(evaluationLabel(evaluation(-500))).toEqual({ text: '500 km under', tone: 'under' })
  })

  it('renders a zero delta as an on-limit label', () => {
    expect(evaluationLabel(evaluation(0))).toEqual({ text: 'On limit', tone: 'on-limit' })
  })

  it('accepts a per-record Evaluation', () => {
    const recordEvaluation: Evaluation = { theoreticalLimit: 1000, delta: 500 }

    expect(evaluationLabel(recordEvaluation)).toEqual({ text: '500 km over', tone: 'over' })
  })

  it('renders a today evaluation without a mileage record as a neutral dash', () => {
    expect(evaluationLabel(evaluation(null))).toEqual({ text: '—', tone: 'none' })
  })
})
