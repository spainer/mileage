import { ref } from 'vue'

import { api } from './api/client'
import { todayIso } from './format'
import type { Car, InsuranceReport, MileageRecord } from './types'

export const cars = ref<Car[]>([])
export const mileageRecords = ref<MileageRecord[]>([])
export const insuranceReports = ref<InsuranceReport[]>([])
export const loading = ref(false)
export const error = ref<string | null>(null)

export async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const loadedCars = await api.listCars()
    const perCar = await Promise.all(
      loadedCars.map((car) =>
        Promise.all([api.listMileageRecords(car.id), api.listInsuranceReports(car.id)]),
      ),
    )
    cars.value = loadedCars
    mileageRecords.value = perCar.map(([records]) => records).flat()
    insuranceReports.value = perCar.map(([, reports]) => reports).flat()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load the garage.'
  } finally {
    loading.value = false
  }
}

interface CarItem {
  id: number
  date: string
  carId: number
}

function byCar<T extends CarItem>(list: T[], carId: number): T[] {
  return list
    .filter((item) => item.carId === carId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function recordsForCar(carId: number): MileageRecord[] {
  return byCar(mileageRecords.value, carId)
}

export function reportsForCar(carId: number): InsuranceReport[] {
  return byCar(insuranceReports.value, carId)
}

export function carById(id: number | null): Car | undefined {
  return cars.value.find((car) => car.id === id)
}

export function latestRecord(carId: number): MileageRecord | undefined {
  return recordsForCar(carId)[0]
}

export interface MileageRow extends MileageRecord {
  delta: number | null
}

export function mileageRowsForCar(carId: number): MileageRow[] {
  const records = recordsForCar(carId)
  return records.map((record, index) => ({
    ...record,
    delta: records[index + 1]
      ? record.odometerReading - records[index + 1].odometerReading
      : null,
  }))
}

export function currentReport(carId: number): InsuranceReport | undefined {
  const today = todayIso()
  return reportsForCar(carId).find((report) => report.date <= today)
}
