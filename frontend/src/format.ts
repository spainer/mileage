import { ApiError, ApiErrorCode, type ValidationField } from './api/client'
import { i18n, locale } from './i18n'
import type { Car, Evaluation, EvaluationLabel, TodayEvaluation } from './types'

export function isoLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayIso(): string {
  return isoLocalDate(new Date())
}

// Presentation only: the ISO date stays the storage/API representation.
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Presentation only: the number stays the storage/API representation.
export function formatKm(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value)
}

export function deltaLabel(delta: number): string {
  return delta > 0 ? `+${formatKm(delta)}` : formatKm(delta)
}

export function formatPlate(license: string): string {
  return license.replace(/-/g, ' - ').replace(/(?<=[A-Za-z])(?=\d)/g, ' ')
}

export function carLabel(car: Car): string {
  return `${car.manufacturer} ${car.model}`
}

export function evaluationLabel(
  evaluation: Evaluation | TodayEvaluation | null | undefined,
): EvaluationLabel {
  if (evaluation == null || evaluation.delta == null) {
    return { text: '—', tone: 'none' }
  }
  if (evaluation.delta > 0) {
    return { text: i18n.global.t('evaluation.over', { km: formatKm(evaluation.delta) }), tone: 'over' }
  }
  if (evaluation.delta < 0) {
    return { text: i18n.global.t('evaluation.under', { km: formatKm(-evaluation.delta) }), tone: 'under' }
  }
  return { text: i18n.global.t('evaluation.onLimit'), tone: 'on-limit' }
}

/**
 * Translate an error into UI copy for the active locale.
 *
 * Known machine-readable codes map to specific messages; everything else —
 * unknown server errors, infrastructure failures, and non-API values —
 * falls back to the localized generic message so raw server details never
 * reach the UI.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case ApiErrorCode.network:
        return i18n.global.t('errors.network')
      case ApiErrorCode.duplicateLicense:
        return i18n.global.t('errors.duplicateLicense')
      case ApiErrorCode.sequenceSameDate:
        return sequenceMessage('odometer.sameDate', err)
      case ApiErrorCode.sequenceTooLow:
        return sequenceMessage('odometer.atLeast', err)
      case ApiErrorCode.sequenceTooHigh:
        return sequenceMessage('odometer.atMost', err)
      case ApiErrorCode.validation:
        return validationMessage(err.fields)
      default:
        return i18n.global.t('errors.generic')
    }
  }
  return i18n.global.t('errors.generic')
}

function sequenceMessage(key: string, err: ApiError): string {
  const km = err.params?.km
  if (typeof km !== 'number') return i18n.global.t('errors.generic')
  return i18n.global.t(key, { km: formatKm(km) })
}

function validationMessage(fields: ValidationField[]): string {
  const field = fields[0]
  if (!field) return i18n.global.t('errors.generic')
  if (field.key === 'license') {
    return field.type === 'missing'
      ? i18n.global.t('carForm.allRequired')
      : i18n.global.t('carForm.licenseInvalid')
  }
  switch (field.key) {
    case 'manufacturer':
    case 'model':
      return i18n.global.t('carForm.allRequired')
    case 'date':
      return i18n.global.t('readingForm.dateRequired')
    case 'odometer_reading':
      return i18n.global.t('readingForm.readingRequired')
    case 'mileage_per_year':
      return i18n.global.t('reportForm.capRequired')
    default:
      return i18n.global.t('errors.generic')
  }
}

const LICENSE_PATTERN =
  /^[A-Z]{1,3}-(?:[A-Z]\d{1,4}[A-Z]?|[A-Z]{2}\d{1,3}[A-Z]?|[A-Z]{2}\d{4})$/

export function normalizeLicense(value: string): string {
  return value.toUpperCase().replace(/ /g, '')
}

export function isValidLicense(value: string): boolean {
  return LICENSE_PATTERN.test(normalizeLicense(value))
}
