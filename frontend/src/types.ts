export interface Car {
  id: number
  manufacturer: string
  model: string
  license: string
}

export interface MileageRecord {
  id: number
  carId: number
  date: string
  odometerReading: number
}

export interface InsuranceReport {
  id: number
  carId: number
  date: string
  odometerReading: number
  mileagePerYear: number
}
