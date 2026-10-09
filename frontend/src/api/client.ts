import type {
  Car,
  Evaluation,
  InsuranceReport,
  MileageRecord,
  TodayEvaluation,
} from '../types'

const BASE = '/api'
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

/**
 * Machine-readable error codes. The backend ships the conflict codes
 * (`duplicate_license`, `odometer_sequence_*`); 400 validation responses are
 * recognized from their list `extra` (code `validation`). `network` is
 * assigned client-side for transport-level failures.
 */
export const ApiErrorCode = {
  network: 'network',
  validation: 'validation',
  duplicateLicense: 'duplicate_license',
  sequenceSameDate: 'odometer_sequence_same_date',
  sequenceTooLow: 'odometer_sequence_too_low',
  sequenceTooHigh: 'odometer_sequence_too_high',
} as const

/** A failed validation field as reported by the backend (field name + rule). */
export interface ValidationField {
  key: string
  type?: string
}

export class ApiError extends Error {
  readonly status: number | null
  /** Machine-readable code for known errors; `null` for unknown/infrastructure errors. */
  readonly code: string | null
  /** Machine-readable values behind the error (e.g. the boundary `km`). */
  readonly params: Record<string, number | string> | null
  /** Failed validation fields with their machine-readable rule types. */
  readonly fields: ValidationField[]

  constructor(
    message: string,
    status: number | null,
    code: string | null,
    params: Record<string, number | string> | null,
    fields: ValidationField[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.params = params
    this.fields = fields
  }
}

interface WireCar {
  id: number
  manufacturer: string
  model: string
  license: string
}

interface WireMileageRecord {
  id: number
  car_id: number
  date: string
  odometer_reading: number
  evaluation?: WireEvaluation | null
}

interface WireEvaluation {
  theoretical_limit: number
  delta: number
}

interface WireInsuranceReport {
  id: number
  car_id: number
  date: string
  odometer_reading: number
  mileage_per_year: number
}

interface WireTodayEvaluation {
  theoretical_limit: number
  delta: number | null
}

function toCar(wire: WireCar): Car {
  return { id: wire.id, manufacturer: wire.manufacturer, model: wire.model, license: wire.license }
}

function toMileageRecord(wire: WireMileageRecord): MileageRecord {
  return {
    id: wire.id,
    carId: wire.car_id,
    date: wire.date,
    odometerReading: wire.odometer_reading,
    evaluation: wire.evaluation ? toEvaluation(wire.evaluation) : wire.evaluation,
  }
}

function toEvaluation(wire: WireEvaluation): Evaluation {
  return {
    theoreticalLimit: wire.theoretical_limit,
    delta: wire.delta,
  }
}

function toInsuranceReport(wire: WireInsuranceReport): InsuranceReport {
  return {
    id: wire.id,
    carId: wire.car_id,
    date: wire.date,
    odometerReading: wire.odometer_reading,
    mileagePerYear: wire.mileage_per_year,
  }
}

function toTodayEvaluation(wire: WireTodayEvaluation): TodayEvaluation {
  return {
    theoreticalLimit: wire.theoretical_limit,
    delta: wire.delta,
  }
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: JSON_HEADERS,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }
}

function messagesFrom(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => (item && typeof item === 'object' && typeof item.message === 'string' ? item.message : ''))
    .filter((message) => message.length > 0)
}

interface ErrorDetails {
  message: string
  code: string | null
  params: Record<string, number | string> | null
  fields: ValidationField[]
}

function isParams(value: unknown): value is Record<string, number | string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'number' || typeof item === 'string')
}

function fieldsFrom(items: unknown): ValidationField[] {
  if (!Array.isArray(items)) return []
  const fields: ValidationField[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const { key, type } = item as { key?: unknown; type?: unknown }
    if (typeof key !== 'string') continue
    if (typeof type === 'string') {
      fields.push({ key, type })
    } else {
      fields.push({ key })
    }
  }
  return fields
}

function errorDetailsFrom(body: unknown, status: number): ErrorDetails {
  const fallback = `Request failed with status ${status}`
  if (typeof body !== 'object' || body === null) {
    return { message: fallback, code: null, params: null, fields: [] }
  }
  const { detail, extra } = body as { detail?: unknown; extra?: unknown }

  // 409 conflicts carry the machine data in `extra` as { code, params }; the
  // human-readable `detail` is kept as the raw message.
  if (typeof extra === 'object' && extra !== null && !Array.isArray(extra)) {
    const machine = extra as { code?: unknown; params?: unknown }
    return {
      message: typeof detail === 'string' && detail.length > 0 ? detail : fallback,
      code: typeof machine.code === 'string' ? machine.code : null,
      params: isParams(machine.params) ? machine.params : null,
      fields: [],
    }
  }

  // Validation failures (400) carry one item per failed field in `extra`
  // (or in the legacy `detail` array of 422 bodies).
  const items = Array.isArray(extra) ? extra : Array.isArray(detail) ? detail : []
  const fields = fieldsFrom(items)
  const messages = messagesFrom(items)
  const message =
    messages.length > 0
      ? messages.join('; ')
      : typeof detail === 'string' && detail.length > 0
        ? detail
        : fallback
  return {
    message,
    code: fields.length > 0 ? ApiErrorCode.validation : null,
    params: null,
    fields,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiError('Could not reach the server.', null, ApiErrorCode.network, null, [])
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    const details = errorDetailsFrom(body, response.status)
    throw new ApiError(details.message, response.status, details.code, details.params, details.fields)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export interface CreateCarInput {
  manufacturer: string
  model: string
  license: string
}

export type UpdateCarInput = Partial<CreateCarInput>

export interface CreateMileageRecordInput {
  date: string
  odometerReading: number
}

export type UpdateMileageRecordInput = Partial<CreateMileageRecordInput>

export interface CreateInsuranceReportInput {
  date: string
  odometerReading: number
  mileagePerYear: number
}

export type UpdateInsuranceReportInput = Partial<CreateInsuranceReportInput>

export const api = {
  listCars: (): Promise<Car[]> => request<WireCar[]>('/cars').then((wires) => wires.map(toCar)),
  getCar: (id: number): Promise<Car> => request<WireCar>(`/cars/${id}`).then(toCar),
  createCar: (data: CreateCarInput): Promise<Car> =>
    request<WireCar>('/cars', jsonInit('POST', data)).then(toCar),
  updateCar: (id: number, data: UpdateCarInput): Promise<Car> =>
    request<WireCar>(`/cars/${id}`, jsonInit('PATCH', data)).then(toCar),
  deleteCar: (id: number): Promise<void> => request<void>(`/cars/${id}`, { method: 'DELETE' }),
  getEvaluation: (carId: number): Promise<TodayEvaluation | null> =>
    request<WireTodayEvaluation | null>(`/cars/${carId}/evaluation`).then((wire) =>
      wire === null ? null : toTodayEvaluation(wire),
    ),

  listMileageRecords: (carId: number): Promise<MileageRecord[]> =>
    request<WireMileageRecord[]>(`/cars/${carId}/mileage-records`).then((wires) => wires.map(toMileageRecord)),
  getMileageRecord: (carId: number, recordId: number): Promise<MileageRecord> =>
    request<WireMileageRecord>(`/cars/${carId}/mileage-records/${recordId}`).then(toMileageRecord),
  createMileageRecord: (carId: number, data: CreateMileageRecordInput): Promise<MileageRecord> =>
    request<WireMileageRecord>(
      `/cars/${carId}/mileage-records`,
      jsonInit('POST', toMileageRecordWire(data)),
    ).then(toMileageRecord),
  updateMileageRecord: (carId: number, recordId: number, data: UpdateMileageRecordInput): Promise<MileageRecord> =>
    request<WireMileageRecord>(
      `/cars/${carId}/mileage-records/${recordId}`,
      jsonInit('PATCH', toMileageRecordWire(data)),
    ).then(toMileageRecord),
  deleteMileageRecord: (carId: number, recordId: number): Promise<void> =>
    request<void>(`/cars/${carId}/mileage-records/${recordId}`, { method: 'DELETE' }),

  listInsuranceReports: (carId: number): Promise<InsuranceReport[]> =>
    request<WireInsuranceReport[]>(`/cars/${carId}/insurance-reports`).then((wires) =>
      wires.map(toInsuranceReport),
    ),
  getInsuranceReport: (carId: number, reportId: number): Promise<InsuranceReport> =>
    request<WireInsuranceReport>(`/cars/${carId}/insurance-reports/${reportId}`).then(toInsuranceReport),
  createInsuranceReport: (carId: number, data: CreateInsuranceReportInput): Promise<InsuranceReport> =>
    request<WireInsuranceReport>(
      `/cars/${carId}/insurance-reports`,
      jsonInit('POST', toInsuranceReportWire(data)),
    ).then(toInsuranceReport),
  updateInsuranceReport: (
    carId: number,
    reportId: number,
    data: UpdateInsuranceReportInput,
  ): Promise<InsuranceReport> =>
    request<WireInsuranceReport>(
      `/cars/${carId}/insurance-reports/${reportId}`,
      jsonInit('PATCH', toInsuranceReportWire(data)),
    ).then(toInsuranceReport),
  deleteInsuranceReport: (carId: number, reportId: number): Promise<void> =>
    request<void>(`/cars/${carId}/insurance-reports/${reportId}`, { method: 'DELETE' }),
}

function toMileageRecordWire(data: UpdateMileageRecordInput): Record<string, unknown> {
  const wire: Record<string, unknown> = {}
  if (data.date !== undefined) wire.date = data.date
  if (data.odometerReading !== undefined) wire.odometer_reading = data.odometerReading
  return wire
}

function toInsuranceReportWire(data: UpdateInsuranceReportInput): Record<string, unknown> {
  const wire: Record<string, unknown> = {}
  if (data.date !== undefined) wire.date = data.date
  if (data.odometerReading !== undefined) wire.odometer_reading = data.odometerReading
  if (data.mileagePerYear !== undefined) wire.mileage_per_year = data.mileagePerYear
  return wire
}
