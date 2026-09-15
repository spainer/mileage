import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { todayIso } from '../format'
import * as state from '../state'
import type { InsuranceReport, MileageRecord } from '../types'
import { jsonResponse } from './helpers'

const fetchMock = vi.fn()

const carsWire = [
  { id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' },
  { id: 2, manufacturer: 'BMW', model: '320d', license: 'B-XYZ 123' },
]

const recordsByCar: Record<number, unknown[]> = {
  1: [
    { id: 11, car_id: 1, date: '2026-01-15', odometer_reading: 84210 },
    { id: 12, car_id: 1, date: '2026-08-30', odometer_reading: 101400 },
  ],
  2: [{ id: 21, car_id: 2, date: '2025-03-10', odometer_reading: 41000 }],
}

const reportsByCar: Record<number, unknown[]> = {
  1: [
    { id: 31, car_id: 1, date: '2026-02-01', odometer_reading: 93400, mileage_per_year: 12000 },
    { id: 32, car_id: 1, date: '2027-01-01', odometer_reading: 110000, mileage_per_year: 9999 },
  ],
  2: [{ id: 41, car_id: 2, date: todayIso(), odometer_reading: 42000, mileage_per_year: 8000 }],
}

function route(url: string): Response {
  const normalized = String(url)
  if (normalized === '/api/cars') return jsonResponse(carsWire)
  const match = normalized.match(/^\/api\/cars\/(\d+)\/(mileage-records|insurance-reports)$/)
  if (match) {
    const carId = Number(match[1])
    const body = match[2] === 'mileage-records' ? recordsByCar[carId] : reportsByCar[carId]
    return jsonResponse(body)
  }
  throw new Error(`unexpected URL: ${normalized}`)
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  state.cars.value = []
  state.mileageRecords.value = []
  state.insuranceReports.value = []
  state.loading.value = false
  state.error.value = null
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('load', () => {
  it('loads the cars and then each car\'s records and reports', async () => {
    fetchMock.mockImplementation((url: string) => route(url))

    await state.load()

    const urls = fetchMock.mock.calls.map((call) => String(call[0])).sort()
    expect(urls).toEqual([
      '/api/cars',
      '/api/cars/1/insurance-reports',
      '/api/cars/1/mileage-records',
      '/api/cars/2/insurance-reports',
      '/api/cars/2/mileage-records',
    ])
  })

  it('stores the cars in domain shape', async () => {
    fetchMock.mockImplementation((url: string) => route(url))

    await state.load()

    expect(state.cars.value).toEqual([
      { id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' },
      { id: 2, manufacturer: 'BMW', model: '320d', license: 'B-XYZ 123' },
    ])
  })

  it('stores all records and reports of all cars in domain shape', async () => {
    fetchMock.mockImplementation((url: string) => route(url))

    await state.load()

    expect(state.mileageRecords.value).toEqual([
      { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210 },
      { id: 12, carId: 1, date: '2026-08-30', odometerReading: 101400 },
      { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000 },
    ])
    expect(state.insuranceReports.value).toEqual([
      { id: 31, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 12000 },
      { id: 32, carId: 1, date: '2027-01-01', odometerReading: 110000, mileagePerYear: 9999 },
      { id: 41, carId: 2, date: todayIso(), odometerReading: 42000, mileagePerYear: 8000 },
    ])
  })

  it('requests the per-car collections in parallel', async () => {
    let inFlight = 0
    let maxInFlight = 0
    fetchMock.mockImplementation(async (url: string) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 10))
      inFlight -= 1
      return route(url)
    })

    await state.load()

    expect(maxInFlight).toBeGreaterThan(1)
  })

  it('exposes loading while the initial load runs', async () => {
    fetchMock.mockImplementation((url: string) => route(url))

    const pending = state.load()
    expect(state.loading.value).toBe(true)
    await pending
    expect(state.loading.value).toBe(false)
  })

  it('records a network failure as an error and keeps the state empty', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await state.load()

    expect(state.error.value).toBe('Could not reach the server.')
    expect(state.cars.value).toEqual([])
    expect(state.mileageRecords.value).toEqual([])
    expect(state.insuranceReports.value).toEqual([])
    expect(state.loading.value).toBe(false)
  })

  it('carries the server detail of an error response into the error state', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status_code: 500, detail: 'Database on fire' }, 500),
    )

    await state.load()

    expect(state.error.value).toBe('Database on fire')
    expect(state.cars.value).toEqual([])
  })

  it('re-runs the load successfully after a failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockImplementation((url: string) => route(url))

    await state.load()
    expect(state.error.value).toBe('Could not reach the server.')

    await state.load()

    expect(state.error.value).toBeNull()
    expect(state.cars.value).toHaveLength(2)
  })
})

describe('queries', () => {
  async function loadState() {
    fetchMock.mockImplementation((url: string) => route(url))
    await state.load()
  }

  it('lists the records of a car newest first', async () => {
    await loadState()

    expect(state.recordsForCar(1).map((record) => record.id)).toEqual([12, 11])
  })

  it('lists the reports of a car newest first', async () => {
    await loadState()

    expect(state.reportsForCar(1).map((report) => report.id)).toEqual([32, 31])
  })

  it('returns the latest record of a car', async () => {
    await loadState()

    expect(state.latestRecord(1)).toEqual({
      id: 12,
      carId: 1,
      date: '2026-08-30',
      odometerReading: 101400,
    })
  })

  it('returns no latest record for a car without records', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url) === '/api/cars') return jsonResponse([{ id: 9, manufacturer: 'Audi', model: 'A3', license: 'B-A3 111' }])
      return jsonResponse([])
    })
    await state.load()

    expect(state.latestRecord(9)).toBeUndefined()
  })

  it('returns the newest report dated on or before today as the in-force report', async () => {
    await loadState()

    expect(state.currentReport(1)).toEqual({
      id: 31,
      carId: 1,
      date: '2026-02-01',
      odometerReading: 93400,
      mileagePerYear: 12000,
    })
  })

  it('excludes reports dated in the future from the in-force report', async () => {
    await loadState()

    const inForce = state.currentReport(1)
    expect(inForce?.id).toBe(31)
    expect(inForce?.date).not.toBe('2027-01-01')
  })

  it('treats a report dated today as in force', async () => {
    await loadState()

    expect(state.currentReport(2)?.mileagePerYear).toBe(8000)
  })

  it('returns no in-force report for a car without reports', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url) === '/api/cars') return jsonResponse([{ id: 9, manufacturer: 'Audi', model: 'A3', license: 'B-A3 111' }])
      return jsonResponse([])
    })
    await state.load()

    expect(state.currentReport(9)).toBeUndefined()
  })
})

describe('query types', () => {
  it('queries return the domain types', () => {
    const records: MileageRecord[] = state.recordsForCar(1)
    const reports: InsuranceReport[] = state.reportsForCar(1)
    expect(records).toEqual([])
    expect(reports).toEqual([])
  })
})
