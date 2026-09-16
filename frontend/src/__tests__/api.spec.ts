import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, ApiError } from '../api/client'
import { jsonResponse } from './helpers'

const fetchMock = vi.fn()

async function expectApiError(promise: Promise<unknown>, status: number | null, message: string) {
  const error = await promise.catch((err: unknown) => err)
  expect(error).toBeInstanceOf(ApiError)
  expect((error as ApiError).status).toBe(status)
  expect((error as ApiError).message).toBe(message)
}

function lastCall() {
  const calls = fetchMock.mock.calls
  const [url, init] = calls[calls.length - 1]
  return { url: String(url), init }
}

function lastBody(): Record<string, unknown> {
  const { init } = lastCall()
  return JSON.parse(String(init?.body))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cars', () => {
  it('lists cars with GET /api/cars and maps wire to domain', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }]),
    )

    const cars = await api.listCars()

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars')
    expect(init).toBeUndefined()
    expect(cars).toEqual([{ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }])
  })

  it('gets one car with GET /api/cars/{id}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 7, manufacturer: 'BMW', model: '320d', license: 'B-XYZ 123' }),
    )

    const car = await api.getCar(7)

    expect(lastCall().url).toBe('/api/cars/7')
    expect(car.id).toBe(7)
    expect(car.license).toBe('B-XYZ 123')
  })

  it('creates a car with POST /api/cars and a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }, 201),
    )

    const car = await api.createCar({ manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(lastBody()).toEqual({ manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' })
    expect(car).toEqual({ id: 1, manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' })
  })

  it('updates a car with PATCH /api/cars/{id} sending only the provided fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 7, manufacturer: 'Audi', model: 'A3', license: 'B-XYZ 123' }),
    )

    await api.updateCar(7, { manufacturer: 'Audi' })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7')
    expect(init?.method).toBe('PATCH')
    expect(lastBody()).toEqual({ manufacturer: 'Audi' })
  })

  it('deletes a car with DELETE /api/cars/{id} and no body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    await expect(api.deleteCar(7)).resolves.toBeUndefined()

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7')
    expect(init?.method).toBe('DELETE')
    expect(init?.body).toBeUndefined()
  })
})

describe('mileage records (nested under a car)', () => {
  it('lists records with GET /api/cars/{id}/mileage-records and maps wire to domain', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 11, car_id: 7, date: '2026-01-15', odometer_reading: 84210 }]),
    )

    const records = await api.listMileageRecords(7)

    expect(lastCall().url).toBe('/api/cars/7/mileage-records')
    expect(records).toEqual([{ id: 11, carId: 7, date: '2026-01-15', odometerReading: 84210 }])
  })

  it('gets one record with GET /api/cars/{id}/mileage-records/{rid}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 11, car_id: 7, date: '2026-01-15', odometer_reading: 84210 }),
    )

    const record = await api.getMileageRecord(7, 11)

    expect(lastCall().url).toBe('/api/cars/7/mileage-records/11')
    expect(record.odometerReading).toBe(84210)
  })

  it('creates a record with POST and a snake_case JSON body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 12, car_id: 7, date: '2026-02-01', odometer_reading: 90000 }, 201),
    )

    const record = await api.createMileageRecord(7, { date: '2026-02-01', odometerReading: 90000 })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/mileage-records')
    expect(init?.method).toBe('POST')
    expect(lastBody()).toEqual({ date: '2026-02-01', odometer_reading: 90000 })
    expect(record).toEqual({ id: 12, carId: 7, date: '2026-02-01', odometerReading: 90000 })
  })

  it('updates a record with PATCH sending snake_case fields only for provided values', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 11, car_id: 7, date: '2026-01-15', odometer_reading: 85000 }),
    )

    await api.updateMileageRecord(7, 11, { odometerReading: 85000 })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/mileage-records/11')
    expect(init?.method).toBe('PATCH')
    expect(lastBody()).toEqual({ odometer_reading: 85000 })
  })

  it('deletes a record with DELETE on the nested path', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    await expect(api.deleteMileageRecord(7, 11)).resolves.toBeUndefined()

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/mileage-records/11')
    expect(init?.method).toBe('DELETE')
  })
})

describe('insurance reports (nested under a car)', () => {
  it('lists reports with GET /api/cars/{id}/insurance-reports and maps wire to domain', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: 21, car_id: 7, date: '2026-02-01', odometer_reading: 90000, mileage_per_year: 10000 },
      ]),
    )

    const reports = await api.listInsuranceReports(7)

    expect(lastCall().url).toBe('/api/cars/7/insurance-reports')
    expect(reports).toEqual([
      { id: 21, carId: 7, date: '2026-02-01', odometerReading: 90000, mileagePerYear: 10000 },
    ])
  })

  it('gets one report with GET /api/cars/{id}/insurance-reports/{rid}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 21, car_id: 7, date: '2026-02-01', odometer_reading: 90000, mileage_per_year: 10000 }),
    )

    const report = await api.getInsuranceReport(7, 21)

    expect(lastCall().url).toBe('/api/cars/7/insurance-reports/21')
    expect(report.mileagePerYear).toBe(10000)
  })

  it('creates a report with POST and a snake_case JSON body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { id: 22, car_id: 7, date: '2026-03-01', odometer_reading: 95000, mileage_per_year: 12000 },
        201,
      ),
    )

    const report = await api.createInsuranceReport(7, {
      date: '2026-03-01',
      odometerReading: 95000,
      mileagePerYear: 12000,
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/insurance-reports')
    expect(init?.method).toBe('POST')
    expect(lastBody()).toEqual({ date: '2026-03-01', odometer_reading: 95000, mileage_per_year: 12000 })
    expect(report.mileagePerYear).toBe(12000)
  })

  it('updates a report with PATCH sending snake_case fields only for provided values', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 21, car_id: 7, date: '2026-02-01', odometer_reading: 90000, mileage_per_year: 8000 }),
    )

    await api.updateInsuranceReport(7, 21, { mileagePerYear: 8000 })

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/insurance-reports/21')
    expect(init?.method).toBe('PATCH')
    expect(lastBody()).toEqual({ mileage_per_year: 8000 })
  })

  it('deletes a report with DELETE on the nested path', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    await expect(api.deleteInsuranceReport(7, 21)).resolves.toBeUndefined()

    const { url, init } = lastCall()
    expect(url).toBe('/api/cars/7/insurance-reports/21')
    expect(init?.method).toBe('DELETE')
  })
})

describe('error translation', () => {
  it('carries the server detail text for 404', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status_code: 404, detail: 'Car 999 not found' }, 404),
    )

    await expectApiError(api.getCar(999), 404, 'Car 999 not found')
  })

  it('carries the server detail text for 409', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status_code: 409, detail: 'A car with this license already exists' }, 409),
    )

    await expectApiError(
      api.createCar({ manufacturer: 'VW', model: 'Golf', license: 'M-AB1234' }),
      409,
      'A car with this license already exists',
    )
  })

  it('surfaces the field message of a 422 validation error body over the generic detail', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          status_code: 422,
          detail: 'Validation failed for POST /api/cars',
          extra: [{ message: 'Field validation failed for license', key: 'license', source: 'body' }],
        },
        422,
      ),
    )

    await expectApiError(
      api.createCar({ manufacturer: 'VW', model: 'Golf', license: 'nope' }),
      422,
      'Field validation failed for license',
    )
  })

  it('surfaces the field message of a 400 validation error body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          status_code: 400,
          detail: 'Validation failed for POST /api/cars',
          extra: [{ message: 'license must be a German license plate: (e.g. M-AB1234)', key: 'license' }],
        },
        400,
      ),
    )

    await expectApiError(
      api.createCar({ manufacturer: 'VW', model: 'Golf', license: 'nope' }),
      400,
      'license must be a German license plate: (e.g. M-AB1234)',
    )
  })

  it('maps a network failure to a distinct error without a status', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expectApiError(api.listCars(), null, 'Could not reach the server.')
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      {
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('not json')
        },
      } as unknown as Response,
    )

    await expectApiError(api.listCars(), 500, 'Request failed with status 500')
  })
})
