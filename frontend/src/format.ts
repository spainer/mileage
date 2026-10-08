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

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : i18n.global.t('form.genericError')
}

const LICENSE_PATTERN =
  /^[A-Z]{1,3}-(?:[A-Z]\d{1,4}[A-Z]?|[A-Z]{2}\d{1,3}[A-Z]?|[A-Z]{2}\d{4})$/

export function normalizeLicense(value: string): string {
  return value.toUpperCase().replace(/ /g, '')
}

export function isValidLicense(value: string): boolean {
  return LICENSE_PATTERN.test(normalizeLicense(value))
}
