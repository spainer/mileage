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

export interface Evaluation {
  theoreticalLimit: number
  delta: number
}

export interface TodayEvaluation {
  theoreticalLimit: number
  delta: number | null
}

export type EvaluationTone = 'over' | 'under' | 'on-limit' | 'none'

export interface EvaluationLabel {
  text: string
  tone: EvaluationTone
}
