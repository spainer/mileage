import type { Car, InsuranceReport, MileageRecord } from '../types'

const BASE = '/api'
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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
}

interface WireInsuranceReport {
  id: number
  car_id: number
  date: string
  odometer_reading: number
  mileage_per_year: number
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

function detailFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown }).detail
    if (Array.isArray(detail)) {
      const messages = messagesFrom(detail)
      if (messages.length > 0) return messages.join('; ')
    }
    const messages = messagesFrom((body as { extra?: unknown }).extra)
    if (messages.length > 0) return messages.join('; ')
    if (typeof detail === 'string' && detail.length > 0) return detail
  }
  return `Request failed with status ${status}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiError('Could not reach the server.', null)
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    throw new ApiError(detailFrom(body, response.status), response.status)
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
