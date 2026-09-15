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

describe('car mutations', () => {
  const newCarWire = { id: 3, manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' }

  function seedCar1() {
    state.cars.value = [{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }]
    state.mileageRecords.value = [
      { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210 },
      { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000 },
    ]
    state.insuranceReports.value = [
      { id: 31, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 12000 },
      { id: 41, carId: 2, date: '2025-03-10', odometerReading: 42000, mileagePerYear: 8000 },
    ]
  }

  describe('createCar', () => {
    it('sends a POST /api/cars with the normalized domain data and adds the returned car', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(newCarWire, 201))

      const car = await state.createCar({ manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' })
      expect(car).toEqual({ id: 3, manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' })
      expect(state.cars.value).toEqual([{ id: 3, manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' }])
    })

    it('propagates a 409 conflict verbatim and keeps the state unchanged', async () => {
      seedCar1()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ status_code: 409, detail: 'A car with this license already exists' }, 409),
      )

      await expect(
        state.createCar({ manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }),
      ).rejects.toThrow('A car with this license already exists')

      expect(state.cars.value).toEqual([{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }])
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(
        state.createCar({ manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY246' }),
      ).rejects.toThrow('Could not reach the server.')

      expect(state.cars.value).toEqual([])
    })
  })

  describe('updateCar', () => {
    it('sends a PATCH with the provided fields and replaces the car in the state', async () => {
      seedCar1()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }),
      )

      const car = await state.updateCar(1, { manufacturer: 'VW' })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1')
      expect(init?.method).toBe('PATCH')
      expect(JSON.parse(String(init?.body))).toEqual({ manufacturer: 'VW' })
      expect(car).toEqual({ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' })
      expect(state.cars.value).toEqual([{ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }])
    })

    it('propagates a 422 validation error verbatim and keeps the state unchanged', async () => {
      seedCar1()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 422,
            detail: 'Validation failed for PATCH /api/cars/1',
            extra: [{ message: 'license must be a German license plate: (e.g. M-AB1234)', key: 'license' }],
          },
          422,
        ),
      )

      await expect(state.updateCar(1, { license: 'nope' })).rejects.toThrow(
        'license must be a German license plate: (e.g. M-AB1234)',
      )

      expect(state.cars.value).toEqual([{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }])
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedCar1()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.updateCar(1, { manufacturer: 'VW' })).rejects.toThrow('Could not reach the server.')

      expect(state.cars.value).toEqual([{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }])
    })
  })

  describe('deleteCar', () => {
    it('sends a DELETE and removes the car with its mileage records and insurance reports', async () => {
      seedCar1()
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

      await state.deleteCar(1)

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1')
      expect(init?.method).toBe('DELETE')
      expect(init?.body).toBeUndefined()
      expect(state.cars.value).toEqual([])
      expect(state.mileageRecords.value).toEqual([
        { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000 },
      ])
      expect(state.insuranceReports.value).toEqual([
        { id: 41, carId: 2, date: '2025-03-10', odometerReading: 42000, mileagePerYear: 8000 },
      ])
    })

    it('propagates a 404 error and keeps the state unchanged', async () => {
      seedCar1()
      fetchMock.mockResolvedValueOnce(jsonResponse({ status_code: 404, detail: 'Car 1 not found' }, 404))

      await expect(state.deleteCar(1)).rejects.toThrow('Car 1 not found')

      expect(state.cars.value).toHaveLength(1)
      expect(state.mileageRecords.value).toHaveLength(2)
      expect(state.insuranceReports.value).toHaveLength(2)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedCar1()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.deleteCar(1)).rejects.toThrow('Could not reach the server.')

      expect(state.cars.value).toHaveLength(1)
      expect(state.mileageRecords.value).toHaveLength(2)
      expect(state.insuranceReports.value).toHaveLength(2)
    })
  })
})

describe('mileage record mutations', () => {
  function seedRecords() {
    state.cars.value = [{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }]
    state.mileageRecords.value = [
      { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210 },
      { id: 12, carId: 1, date: '2026-08-30', odometerReading: 101400 },
      { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000 },
    ]
  }

  describe('createMileageRecord', () => {
    it('sends a POST /api/cars/{id}/mileage-records and adds the returned record', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 13, car_id: 1, date: '2026-09-15', odometer_reading: 104300 }, 201),
      )

      const record = await state.createMileageRecord(1, { date: '2026-09-15', odometerReading: 104300 })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/mileage-records')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ date: '2026-09-15', odometer_reading: 104300 })
      expect(record).toEqual({ id: 13, carId: 1, date: '2026-09-15', odometerReading: 104300 })
      expect(state.latestRecord(1)).toEqual({ id: 13, carId: 1, date: '2026-09-15', odometerReading: 104300 })
    })

    it('recomputes the deltas for the new row', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 13, car_id: 1, date: '2026-09-15', odometer_reading: 104300 }, 201),
      )

      await state.createMileageRecord(1, { date: '2026-09-15', odometerReading: 104300 })

      expect(state.mileageRowsForCar(1)).toEqual([
        { id: 13, carId: 1, date: '2026-09-15', odometerReading: 104300, delta: 2900 },
        { id: 12, carId: 1, date: '2026-08-30', odometerReading: 101400, delta: 17190 },
        { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210, delta: null },
      ])
      expect(state.mileageRowsForCar(2)).toHaveLength(1)
    })

    it('propagates a validation error verbatim and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 400,
            detail: 'Validation failed for POST /api/cars/1/mileage-records',
            extra: [{ message: 'odometer_reading: Input should be a valid integer', key: 'odometer_reading' }],
          },
          400,
        ),
      )

      await expect(
        state.createMileageRecord(1, { date: '2026-09-15', odometerReading: 104300 }),
      ).rejects.toThrow('odometer_reading: Input should be a valid integer')

      expect(state.mileageRecords.value).toHaveLength(3)
    })

    it('propagates a 422 error verbatim and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 422,
            detail: 'Validation failed for POST /api/cars/1/mileage-records',
            extra: [{ message: 'odometer_reading: Input should be greater than or equal to 0', key: 'odometer_reading' }],
          },
          422,
        ),
      )

      await expect(
        state.createMileageRecord(1, { date: '2026-09-15', odometerReading: -5 }),
      ).rejects.toThrow('odometer_reading: Input should be greater than or equal to 0')

      expect(state.mileageRecords.value).toHaveLength(3)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(
        state.createMileageRecord(1, { date: '2026-09-15', odometerReading: 104300 }),
      ).rejects.toThrow('Could not reach the server.')

      expect(state.mileageRecords.value).toHaveLength(3)
    })
  })

  describe('updateMileageRecord', () => {
    it('sends a PATCH with the provided fields and replaces the record in the state', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 12, car_id: 1, date: '2026-09-01', odometer_reading: 102000 }),
      )

      const record = await state.updateMileageRecord(1, 12, { date: '2026-09-01', odometerReading: 102000 })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/mileage-records/12')
      expect(init?.method).toBe('PATCH')
      expect(JSON.parse(String(init?.body))).toEqual({ date: '2026-09-01', odometer_reading: 102000 })
      expect(record).toEqual({ id: 12, carId: 1, date: '2026-09-01', odometerReading: 102000 })
      expect(state.mileageRecords.value).toEqual([
        { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210 },
        { id: 12, carId: 1, date: '2026-09-01', odometerReading: 102000 },
        { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000 },
      ])
    })

    it('saves a reading lower than the previous one and shows the negative delta', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 12, car_id: 1, date: '2026-08-30', odometer_reading: 80000 }),
      )

      await state.updateMileageRecord(1, 12, { odometerReading: 80000 })

      expect(state.latestRecord(1)).toEqual({ id: 12, carId: 1, date: '2026-08-30', odometerReading: 80000 })
      expect(state.mileageRowsForCar(1)).toEqual([
        { id: 12, carId: 1, date: '2026-08-30', odometerReading: 80000, delta: -4210 },
        { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210, delta: null },
      ])
    })

    it('propagates a validation error verbatim and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 400,
            detail: 'Validation failed for PATCH /api/cars/1/mileage-records/12',
            extra: [{ message: 'odometer_reading: Input should be greater than or equal to 0', key: 'odometer_reading' }],
          },
          400,
        ),
      )

      await expect(
        state.updateMileageRecord(1, 12, { odometerReading: -5 }),
      ).rejects.toThrow('odometer_reading: Input should be greater than or equal to 0')

      expect(state.mileageRecords.value).toHaveLength(3)
    })

    it('propagates a 404 error and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(jsonResponse({ status_code: 404, detail: 'Mileage record 99 not found' }, 404))

      await expect(state.updateMileageRecord(1, 99, { odometerReading: 500 })).rejects.toThrow(
        'Mileage record 99 not found',
      )

      expect(state.mileageRecords.value).toHaveLength(3)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.updateMileageRecord(1, 12, { odometerReading: 90000 })).rejects.toThrow(
        'Could not reach the server.',
      )

      expect(state.mileageRecords.value).toHaveLength(3)
    })
  })

  describe('deleteMileageRecord', () => {
    it('sends a DELETE and removes the record; the derived values follow', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

      await state.deleteMileageRecord(1, 12)

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/mileage-records/12')
      expect(init?.method).toBe('DELETE')
      expect(init?.body).toBeUndefined()
      expect(state.latestRecord(1)).toEqual({ id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210 })
      expect(state.mileageRowsForCar(1)).toEqual([
        { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210, delta: null },
      ])
      expect(state.mileageRowsForCar(2)).toHaveLength(1)
    })

    it('propagates a 404 error and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ status_code: 404, detail: 'Mileage record 99 not found' }, 404),
      )

      await expect(state.deleteMileageRecord(1, 99)).rejects.toThrow('Mileage record 99 not found')

      expect(state.mileageRecords.value).toHaveLength(3)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedRecords()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.deleteMileageRecord(1, 12)).rejects.toThrow('Could not reach the server.')

      expect(state.mileageRecords.value).toHaveLength(3)
    })
  })
})

describe('insurance report mutations', () => {
  function seedReports() {
    state.cars.value = [{ id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }]
    state.insuranceReports.value = [
      { id: 30, carId: 1, date: '2025-01-01', odometerReading: 80000, mileagePerYear: 5000 },
      { id: 31, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 12000 },
      { id: 32, carId: 1, date: '2027-01-01', odometerReading: 110000, mileagePerYear: 9999 },
      { id: 41, carId: 2, date: '2025-03-10', odometerReading: 42000, mileagePerYear: 8000 },
    ]
  }

  describe('createInsuranceReport', () => {
    it('sends a POST /api/cars/{id}/insurance-reports with the snake_case data and adds the returned report', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { id: 33, car_id: 1, date: todayIso(), odometer_reading: 105000, mileage_per_year: 10000 },
          201,
        ),
      )

      const report = await state.createInsuranceReport(1, {
        date: todayIso(),
        odometerReading: 105000,
        mileagePerYear: 10000,
      })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/insurance-reports')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({
        date: todayIso(),
        odometer_reading: 105000,
        mileage_per_year: 10000,
      })
      expect(report).toEqual({ id: 33, carId: 1, date: todayIso(), odometerReading: 105000, mileagePerYear: 10000 })
      expect(state.reportsForCar(1).map((r) => r.id)).toEqual([32, 33, 31, 30])
    })

    it('marks the new report in force when it is dated on or before today', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { id: 33, car_id: 1, date: todayIso(), odometer_reading: 105000, mileage_per_year: 10000 },
          201,
        ),
      )

      await state.createInsuranceReport(1, { date: todayIso(), odometerReading: 105000, mileagePerYear: 10000 })

      expect(state.currentReport(1)?.id).toBe(33)
      expect(state.currentReport(1)?.mileagePerYear).toBe(10000)
    })

    it('keeps the previous in-force report when the new one is dated in the future', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { id: 33, car_id: 1, date: '2027-06-01', odometer_reading: 105000, mileage_per_year: 10000 },
          201,
        ),
      )

      await state.createInsuranceReport(1, { date: '2027-06-01', odometerReading: 105000, mileagePerYear: 10000 })

      expect(state.currentReport(1)?.id).toBe(31)
    })

    it('propagates a validation error verbatim and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 422,
            detail: 'Validation failed for POST /api/cars/1/insurance-reports',
            extra: [{ message: 'mileage_per_year: Input should be greater than or equal to 0', key: 'mileage_per_year' }],
          },
          422,
        ),
      )

      await expect(
        state.createInsuranceReport(1, { date: '2026-09-15', odometerReading: 105000, mileagePerYear: -5 }),
      ).rejects.toThrow('mileage_per_year: Input should be greater than or equal to 0')

      expect(state.insuranceReports.value).toHaveLength(4)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(
        state.createInsuranceReport(1, { date: '2026-09-15', odometerReading: 105000, mileagePerYear: 10000 }),
      ).rejects.toThrow('Could not reach the server.')

      expect(state.insuranceReports.value).toHaveLength(4)
    })
  })

  describe('updateInsuranceReport', () => {
    it('sends a PATCH with the provided fields and replaces the report in the state', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 31, car_id: 1, date: '2026-02-01', odometer_reading: 93400, mileage_per_year: 10000 }),
      )

      const report = await state.updateInsuranceReport(1, 31, { mileagePerYear: 10000 })

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/insurance-reports/31')
      expect(init?.method).toBe('PATCH')
      expect(JSON.parse(String(init?.body))).toEqual({ mileage_per_year: 10000 })
      expect(report).toEqual({ id: 31, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 10000 })
      expect(state.insuranceReports.value).toEqual([
        { id: 30, carId: 1, date: '2025-01-01', odometerReading: 80000, mileagePerYear: 5000 },
        { id: 31, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 10000 },
        { id: 32, carId: 1, date: '2027-01-01', odometerReading: 110000, mileagePerYear: 9999 },
        { id: 41, carId: 2, date: '2025-03-10', odometerReading: 42000, mileagePerYear: 8000 },
      ])
    })

    it('moves the in-force mark to the next older report when the in-force report is edited to a future date', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 31, car_id: 1, date: '2027-06-01', odometer_reading: 93400, mileage_per_year: 12000 }),
      )

      await state.updateInsuranceReport(1, 31, { date: '2027-06-01' })

      expect(state.currentReport(1)?.id).toBe(30)
    })

    it('marks an edited future report in force when it is dated on or before today', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 32, car_id: 1, date: '2026-08-01', odometer_reading: 110000, mileage_per_year: 9999 }),
      )

      await state.updateInsuranceReport(1, 32, { date: '2026-08-01' })

      expect(state.currentReport(1)?.id).toBe(32)
    })

    it('propagates a validation error verbatim and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            status_code: 400,
            detail: 'Validation failed for PATCH /api/cars/1/insurance-reports/31',
            extra: [{ message: 'mileage_per_year: Input should be greater than or equal to 0', key: 'mileage_per_year' }],
          },
          400,
        ),
      )

      await expect(state.updateInsuranceReport(1, 31, { mileagePerYear: -5 })).rejects.toThrow(
        'mileage_per_year: Input should be greater than or equal to 0',
      )

      expect(state.insuranceReports.value).toHaveLength(4)
    })

    it('propagates a 404 error and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ status_code: 404, detail: 'Insurance report 99 not found' }, 404),
      )

      await expect(state.updateInsuranceReport(1, 99, { mileagePerYear: 5000 })).rejects.toThrow(
        'Insurance report 99 not found',
      )

      expect(state.insuranceReports.value).toHaveLength(4)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.updateInsuranceReport(1, 31, { mileagePerYear: 10000 })).rejects.toThrow(
        'Could not reach the server.',
      )

      expect(state.insuranceReports.value).toHaveLength(4)
    })
  })

  describe('deleteInsuranceReport', () => {
    it('sends a DELETE and removes the report; the in-force report falls back to the next older one', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

      await state.deleteInsuranceReport(1, 31)

      const [url, init] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('/api/cars/1/insurance-reports/31')
      expect(init?.method).toBe('DELETE')
      expect(init?.body).toBeUndefined()
      expect(state.insuranceReports.value).toHaveLength(3)
      expect(state.reportsForCar(1).map((r) => r.id)).toEqual([32, 30])
      expect(state.currentReport(1)?.id).toBe(30)
    })

    it('leaves the in-force report untouched when deleting another report', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

      await state.deleteInsuranceReport(1, 32)

      expect(state.currentReport(1)?.id).toBe(31)
    })

    it('leaves no in-force report when the in-force report is deleted and only future ones remain', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      await state.deleteInsuranceReport(1, 30)
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

      await state.deleteInsuranceReport(1, 31)

      expect(state.currentReport(1)).toBeUndefined()
    })

    it('propagates a 404 error and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ status_code: 404, detail: 'Insurance report 99 not found' }, 404),
      )

      await expect(state.deleteInsuranceReport(1, 99)).rejects.toThrow('Insurance report 99 not found')

      expect(state.insuranceReports.value).toHaveLength(4)
    })

    it('propagates a network error and keeps the state unchanged', async () => {
      seedReports()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(state.deleteInsuranceReport(1, 31)).rejects.toThrow('Could not reach the server.')

      expect(state.insuranceReports.value).toHaveLength(4)
    })
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

describe('slideover queries', () => {
  it('returns a car by id', async () => {
    fetchMock.mockImplementation((url: string) => route(url))
    await state.load()

    expect(state.carById(1)).toEqual({
      id: 1,
      manufacturer: 'Volkswagen',
      model: 'Golf',
      license: 'M-AB1234',
    })
  })

  it('returns no car for an unknown or null id', async () => {
    fetchMock.mockImplementation((url: string) => route(url))
    await state.load()

    expect(state.carById(999)).toBeUndefined()
    expect(state.carById(null)).toBeUndefined()
  })

  it('lists the car\'s records newest first with the delta since the previous reading', async () => {
    fetchMock.mockImplementation((url: string) => route(url))
    await state.load()

    expect(state.mileageRowsForCar(1)).toEqual([
      { id: 12, carId: 1, date: '2026-08-30', odometerReading: 101400, delta: 17190 },
      { id: 11, carId: 1, date: '2026-01-15', odometerReading: 84210, delta: null },
    ])
  })

  it('lists a single record with no delta', async () => {
    fetchMock.mockImplementation((url: string) => route(url))
    await state.load()

    expect(state.mileageRowsForCar(2)).toEqual([
      { id: 21, carId: 2, date: '2025-03-10', odometerReading: 41000, delta: null },
    ])
  })

  it('lists a negative delta when a reading went down', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url) === '/api/cars') {
        return jsonResponse([{ id: 9, manufacturer: 'Audi', model: 'A3', license: 'B-A3 111' }])
      }
      if (String(url) === '/api/cars/9/mileage-records') {
        return jsonResponse([
          { id: 91, car_id: 9, date: '2026-01-01', odometer_reading: 10000 },
          { id: 92, car_id: 9, date: '2026-02-01', odometer_reading: 12000 },
          { id: 93, car_id: 9, date: '2026-03-01', odometer_reading: 11000 },
        ])
      }
      return jsonResponse([])
    })
    await state.load()

    expect(state.mileageRowsForCar(9).map((row) => row.id)).toEqual([93, 92, 91])
    expect(state.mileageRowsForCar(9).map((row) => row.delta)).toEqual([-1000, 2000, null])
  })

  it('returns no rows for a car without records', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url) === '/api/cars') {
        return jsonResponse([{ id: 9, manufacturer: 'Audi', model: 'A3', license: 'B-A3 111' }])
      }
      return jsonResponse([])
    })
    await state.load()

    expect(state.mileageRowsForCar(9)).toEqual([])
  })
})
