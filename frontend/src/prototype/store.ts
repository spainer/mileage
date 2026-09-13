// PROTOTYPE ONLY — throwaway in-memory state. No persistence: everything
// resets on reload. Shapes mirror the backend API but nothing talks to it.
import { ref } from 'vue'
import { todayIso } from './format'
import type { Car, InsuranceReport, MileageRecord } from './types'

interface SeedData {
  cars: Car[]
  records: MileageRecord[]
  reports: InsuranceReport[]
}

function seed(): SeedData {
  return {
    cars: [
      { id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-GC 4821' },
      { id: 2, manufacturer: 'BMW', model: '320d', license: 'B-XYZ 123' },
      { id: 3, manufacturer: 'Toyota', model: 'Corolla', license: 'K-TOY 2461' },
    ],
    records: [
      { id: 101, carId: 1, date: '2025-01-15', odometerReading: 84210 },
      { id: 102, carId: 1, date: '2025-06-02', odometerReading: 89750 },
      { id: 103, carId: 1, date: '2025-11-20', odometerReading: 96200 },
      { id: 104, carId: 1, date: '2026-08-30', odometerReading: 101400 },
      { id: 105, carId: 2, date: '2025-03-10', odometerReading: 41000 },
      { id: 106, carId: 2, date: '2025-12-01', odometerReading: 47500 },
      { id: 107, carId: 2, date: '2026-09-01', odometerReading: 52100 },
      { id: 108, carId: 3, date: '2025-05-18', odometerReading: 21500 },
      { id: 109, carId: 3, date: '2026-04-22', odometerReading: 33800 },
    ],
    reports: [
      { id: 201, carId: 1, date: '2025-02-01', odometerReading: 85000, mileagePerYear: 10000 },
      { id: 202, carId: 1, date: '2026-02-01', odometerReading: 93400, mileagePerYear: 12000 },
      { id: 203, carId: 2, date: '2025-03-15', odometerReading: 41000, mileagePerYear: 8000 },
      { id: 204, carId: 2, date: '2026-03-15', odometerReading: 45500, mileagePerYear: 8000 },
      { id: 205, carId: 3, date: '2026-05-01', odometerReading: 30000, mileagePerYear: 15000 },
    ],
  }
}

const initial = seed()
let nextId = 1000

export const cars = ref<Car[]>([...initial.cars])
export const mileageRecords = ref<MileageRecord[]>([...initial.records])
export const insuranceReports = ref<InsuranceReport[]>([...initial.reports])

export function addCar(data: Pick<Car, 'manufacturer' | 'model' | 'license'>): Car {
  const car: Car = { id: nextId++, ...data }
  cars.value.push(car)
  return car
}

export function updateCar(
  id: number,
  data: Partial<Pick<Car, 'manufacturer' | 'model' | 'license'>>,
): void {
  const index = cars.value.findIndex((car) => car.id === id)
  if (index !== -1) cars.value[index] = { ...cars.value[index], ...data }
}

export function deleteCar(id: number): void {
  cars.value = cars.value.filter((car) => car.id !== id)
  mileageRecords.value = mileageRecords.value.filter((record) => record.carId !== id)
  insuranceReports.value = insuranceReports.value.filter((report) => report.carId !== id)
}

export function addMileageRecord(
  carId: number,
  data: Pick<MileageRecord, 'date' | 'odometerReading'>,
): MileageRecord {
  const record: MileageRecord = { id: nextId++, carId, ...data }
  mileageRecords.value.push(record)
  return record
}

export function updateMileageRecord(
  id: number,
  data: Partial<Pick<MileageRecord, 'date' | 'odometerReading'>>,
): void {
  const index = mileageRecords.value.findIndex((record) => record.id === id)
  if (index !== -1) mileageRecords.value[index] = { ...mileageRecords.value[index], ...data }
}

export function deleteMileageRecord(id: number): void {
  mileageRecords.value = mileageRecords.value.filter((record) => record.id !== id)
}

export function addInsuranceReport(
  carId: number,
  data: Pick<InsuranceReport, 'date' | 'odometerReading' | 'mileagePerYear'>,
): InsuranceReport {
  const report: InsuranceReport = { id: nextId++, carId, ...data }
  insuranceReports.value.push(report)
  return report
}

export function updateInsuranceReport(
  id: number,
  data: Partial<Pick<InsuranceReport, 'date' | 'odometerReading' | 'mileagePerYear'>>,
): void {
  const index = insuranceReports.value.findIndex((report) => report.id === id)
  if (index !== -1) insuranceReports.value[index] = { ...insuranceReports.value[index], ...data }
}

export function deleteInsuranceReport(id: number): void {
  insuranceReports.value = insuranceReports.value.filter((report) => report.id !== id)
}

export function resetDemoData(): void {
  const fresh = seed()
  cars.value = [...fresh.cars]
  mileageRecords.value = [...fresh.records]
  insuranceReports.value = [...fresh.reports]
}

export function carById(id: number | null | undefined): Car | undefined {
  return cars.value.find((car) => car.id === id)
}

// Newest first.
export function recordsForCar(carId: number): MileageRecord[] {
  return mileageRecords.value
    .filter((record) => record.carId === carId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

// Newest first.
export function reportsForCar(carId: number): InsuranceReport[] {
  return insuranceReports.value
    .filter((report) => report.carId === carId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function latestRecord(carId: number): MileageRecord | undefined {
  return recordsForCar(carId)[0]
}

// The newest report dated on or before today — the in-force annual mileage cap.
export function currentReport(carId: number): InsuranceReport | undefined {
  const today = todayIso()
  return reportsForCar(carId).find((report) => report.date <= today)
}

export interface TimelineEvent {
  id: number
  kind: 'record' | 'report'
  carId: number
  date: string
  odometerReading: number
  mileagePerYear?: number
}

// All entries of both kinds, newest first.
export function allEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...mileageRecords.value.map(
      (record): TimelineEvent => ({
        id: record.id,
        kind: 'record',
        carId: record.carId,
        date: record.date,
        odometerReading: record.odometerReading,
      }),
    ),
    ...insuranceReports.value.map(
      (report): TimelineEvent => ({
        id: report.id,
        kind: 'report',
        carId: report.carId,
        date: report.date,
        odometerReading: report.odometerReading,
        mileagePerYear: report.mileagePerYear,
      }),
    ),
  ]
  return events.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}
