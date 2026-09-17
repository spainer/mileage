import { ref } from 'vue'

import {
  api,
  type CreateCarInput,
  type CreateInsuranceReportInput,
  type CreateMileageRecordInput,
  type UpdateCarInput,
  type UpdateInsuranceReportInput,
  type UpdateMileageRecordInput,
} from './api/client'
import { todayIso } from './format'
import type { OdometerEntry } from './odometerSequence'
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

export async function createCar(data: CreateCarInput): Promise<Car> {
  const car = await api.createCar(data)
  cars.value.push(car)
  return car
}

export async function updateCar(id: number, data: UpdateCarInput): Promise<Car> {
  const car = await api.updateCar(id, data)
  const index = cars.value.findIndex((existing) => existing.id === id)
  if (index !== -1) cars.value[index] = car
  return car
}

export async function deleteCar(id: number): Promise<void> {
  await api.deleteCar(id)
  cars.value = cars.value.filter((car) => car.id !== id)
  mileageRecords.value = mileageRecords.value.filter((record) => record.carId !== id)
  insuranceReports.value = insuranceReports.value.filter((report) => report.carId !== id)
}

export async function createMileageRecord(
  carId: number,
  data: CreateMileageRecordInput,
): Promise<MileageRecord> {
  const record = await api.createMileageRecord(carId, data)
  mileageRecords.value.push(record)
  return record
}

export async function updateMileageRecord(
  carId: number,
  recordId: number,
  data: UpdateMileageRecordInput,
): Promise<MileageRecord> {
  const record = await api.updateMileageRecord(carId, recordId, data)
  const index = mileageRecords.value.findIndex((existing) => existing.id === recordId)
  if (index !== -1) mileageRecords.value[index] = record
  return record
}

export async function deleteMileageRecord(carId: number, recordId: number): Promise<void> {
  await api.deleteMileageRecord(carId, recordId)
  mileageRecords.value = mileageRecords.value.filter((record) => record.id !== recordId)
}

export async function createInsuranceReport(
  carId: number,
  data: CreateInsuranceReportInput,
): Promise<InsuranceReport> {
  const report = await api.createInsuranceReport(carId, data)
  insuranceReports.value.push(report)
  return report
}

export async function updateInsuranceReport(
  carId: number,
  reportId: number,
  data: UpdateInsuranceReportInput,
): Promise<InsuranceReport> {
  const report = await api.updateInsuranceReport(carId, reportId, data)
  const index = insuranceReports.value.findIndex((existing) => existing.id === reportId)
  if (index !== -1) insuranceReports.value[index] = report
  return report
}

export async function deleteInsuranceReport(carId: number, reportId: number): Promise<void> {
  await api.deleteInsuranceReport(carId, reportId)
  insuranceReports.value = insuranceReports.value.filter((report) => report.id !== reportId)
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

export type SequenceEntry =
  | (MileageRecord & { kind: 'record' })
  | (InsuranceReport & { kind: 'report' })

export function entriesForCar(
  carId: number,
  excludeId?: number,
): OdometerEntry[] {
  const out: OdometerEntry[] = []
  for (const record of mileageRecords.value) {
    if (record.carId !== carId) continue
    if (excludeId !== undefined && record.id === excludeId) continue
    out.push({
      id: record.id,
      date: record.date,
      odometerReading: record.odometerReading,
    })
  }
  for (const report of insuranceReports.value) {
    if (report.carId !== carId) continue
    if (excludeId !== undefined && report.id === excludeId) continue
    out.push({
      id: report.id,
      date: report.date,
      odometerReading: report.odometerReading,
    })
  }
  return out
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
