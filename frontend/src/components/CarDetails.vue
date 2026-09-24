<script setup lang="ts">
import { computed, ref } from 'vue'

import { deltaLabel, evaluationLabel, formatDate, formatKm } from '../format'
import {
  currentReport,
  latestEntryForCar,
  reportsForCar,
  timelineForCar,
} from '../state'
import type { EntryRow, RecordRow } from '../state'
import { evaluationToneClasses } from '../theme'
import type { Car, EvaluationLabel, InsuranceReport } from '../types'
import InsuranceReportModal from './InsuranceReportModal.vue'
import MileageRecordModal from './MileageRecordModal.vue'

const props = defineProps<{
  car: Car
}>()

type TimelineRow = EntryRow & { delta: number | null }

const rows = computed<TimelineRow[]>(() => {
  const timeline = timelineForCar(props.car.id)
  return timeline.map((row, index) => ({
    ...row,
    delta: timeline[index + 1]
      ? row.odometerReading - timeline[index + 1].odometerReading
      : null,
  }))
})
const latest = computed(() => latestEntryForCar(props.car.id))
const reports = computed(() => reportsForCar(props.car.id))
const inForce = computed(() => currentReport(props.car.id))

const recordModalOpen = ref(false)
const editingRecord = ref<RecordRow | null>(null)

const reportModalOpen = ref(false)
const editingReport = ref<InsuranceReport | null>(null)

const rightAligned = { class: { th: 'text-right', td: 'text-right' } }

const mileageColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'delta', header: 'Since last', meta: rightAligned },
  { accessorKey: 'evaluation', header: 'Limit', meta: rightAligned },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

const reportColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'mileagePerYear', header: 'Cap / year', meta: rightAligned },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

function openAddRecord() {
  editingRecord.value = null
  recordModalOpen.value = true
}

function openEditRecord(record: RecordRow) {
  editingRecord.value = record
  recordModalOpen.value = true
}

function openAddReport() {
  editingReport.value = null
  reportModalOpen.value = true
}

function openEditReport(report: InsuranceReport) {
  editingReport.value = report
  reportModalOpen.value = true
}

function limitLabel(row: EntryRow): EvaluationLabel {
  if (row.kind === 'record') {
    return evaluationLabel(row.evaluation)
  }
  const onLimit = evaluationLabel({ theoreticalLimit: row.odometerReading, delta: 0 })
  return { text: '+0 km', tone: onLimit.tone }
}

function openEditEntry(row: EntryRow) {
  if (row.kind === 'record') {
    openEditRecord(row)
    return
  }
  openEditReport({ ...row, carId: props.car.id })
}

function pencilLabel(row: EntryRow): string {
  return row.kind === 'record' ? 'Edit reading' : 'Edit report'
}
</script>

<template>
  <UTabs
    :items="[
      { label: 'Mileage', slot: 'mileage', icon: 'i-lucide-gauge' },
      { label: 'Insurance', slot: 'insurance', icon: 'i-lucide-shield-check' },
    ]"
  >
    <template #mileage>
      <div class="grid gap-3">
        <div class="flex items-center justify-between gap-2">
          <p v-if="latest" class="truncate text-sm text-muted">
            Latest:
            <span class="font-medium text-foreground">
              {{ formatKm(latest.odometerReading) }} km
            </span>
            on {{ formatDate(latest.date) }}
          </p>
          <p v-else class="text-sm text-muted">No readings yet</p>
          <UButton size="sm" color="primary" icon="i-lucide-plus" @click="openAddRecord">
            Add reading
          </UButton>
        </div>

        <div class="hidden md:block">
          <UTable v-if="rows.length" :data="rows" :columns="mileageColumns">
            <template #date-cell="{ row }">
              <span class="tabular-nums">{{ formatDate(row.original.date) }}</span>
            </template>
            <template #odometerReading-cell="{ row }">
              <span class="font-medium tabular-nums">
                {{ formatKm(row.original.odometerReading) }} km
              </span>
              <span
                v-if="row.original.kind === 'report'"
                class="block text-xs text-muted tabular-nums"
              >
                {{ formatKm(row.original.mileagePerYear) }} km/year
              </span>
            </template>
            <template #delta-cell="{ row }">
              <span
                v-if="row.original.delta !== null"
                class="tabular-nums text-success"
              >
                {{ deltaLabel(row.original.delta) }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
            <template #evaluation-cell="{ row }">
              <span
                :class="[
                  'tabular-nums',
                  evaluationToneClasses[limitLabel(row.original).tone],
                ]"
              >
                {{ limitLabel(row.original).text }}
              </span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  :aria-label="pencilLabel(row.original)"
                  @click="openEditEntry(row.original)"
                />
              </div>
            </template>
          </UTable>
          <p
            v-else
            class="rounded-lg border border-dashed py-8 text-center text-sm text-muted"
          >
            No mileage readings yet.
          </p>
        </div>

        <div class="grid gap-2 md:hidden">
          <UCard v-for="row in rows" :key="`${row.kind}-${row.id}`">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium tabular-nums">
                  {{ formatKm(row.odometerReading) }} km
                  <span v-if="row.kind === 'report'" class="font-normal text-muted">
                    · {{ formatKm(row.mileagePerYear) }} km/year
                  </span>
                </p>
                <p class="text-sm text-muted tabular-nums">
                  {{ formatDate(row.date) }}
                  <span v-if="row.delta !== null"> · {{ deltaLabel(row.delta) }} km</span>
                  <span v-else> · —</span>
                  <span :class="evaluationToneClasses[limitLabel(row).tone]">
                    · {{ limitLabel(row).text }}
                  </span>
                </p>
              </div>
              <div class="flex shrink-0">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  :aria-label="pencilLabel(row)"
                  @click="openEditEntry(row)"
                />
              </div>
            </div>
          </UCard>
          <p
            v-if="rows.length === 0"
            class="rounded-lg border border-dashed py-8 text-center text-sm text-muted"
          >
            No mileage readings yet.
          </p>
        </div>
      </div>
    </template>

    <template #insurance>
      <div class="grid gap-3">
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm text-muted">
            In force:
            <span v-if="inForce" class="font-medium text-foreground">
              {{ formatKm(inForce.mileagePerYear) }} km/year
            </span>
            <span v-else>no report yet</span>
          </p>
          <UButton size="sm" color="primary" icon="i-lucide-plus" @click="openAddReport">
            Add report
          </UButton>
        </div>

        <div class="hidden md:block">
          <UTable v-if="reports.length" :data="reports" :columns="reportColumns">
            <template #date-cell="{ row }">
              <span class="tabular-nums">{{ formatDate(row.original.date) }}</span>
            </template>
            <template #odometerReading-cell="{ row }">
              <span class="tabular-nums">
                {{ formatKm(row.original.odometerReading) }} km
              </span>
            </template>
            <template #mileagePerYear-cell="{ row }">
              <div class="flex items-center justify-end gap-2">
                <span class="font-medium tabular-nums">
                  {{ formatKm(row.original.mileagePerYear) }}
                </span>
                <UBadge
                  v-if="inForce && row.original.id === inForce.id"
                  size="sm"
                  color="success"
                  variant="subtle"
                >
                  In force
                </UBadge>
              </div>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit report"
                  @click="openEditReport(row.original)"
                />
              </div>
            </template>
          </UTable>
          <p
            v-else
            class="rounded-lg border border-dashed py-8 text-center text-sm text-muted"
          >
            No insurance reports yet.
          </p>
        </div>

        <div class="grid gap-2 md:hidden">
          <UCard v-for="row in reports" :key="row.id">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="flex items-center gap-2 font-medium tabular-nums">
                  {{ formatKm(row.mileagePerYear) }} km/year
                  <UBadge
                    v-if="inForce && row.id === inForce.id"
                    size="sm"
                    color="success"
                    variant="subtle"
                  >
                    In force
                  </UBadge>
                </p>
                <p class="text-sm text-muted tabular-nums">
                  {{ formatDate(row.date) }} · at {{ formatKm(row.odometerReading) }} km
                </p>
              </div>
              <div class="flex shrink-0">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit report"
                  @click="openEditReport(row)"
                />
              </div>
            </div>
          </UCard>
          <p
            v-if="reports.length === 0"
            class="rounded-lg border border-dashed py-8 text-center text-sm text-muted"
          >
            No insurance reports yet.
          </p>
        </div>
      </div>
    </template>
  </UTabs>

  <MileageRecordModal
    :open="recordModalOpen"
    :car="car"
    :record="editingRecord"
    @update:open="recordModalOpen = $event"
  />
  <InsuranceReportModal
    :open="reportModalOpen"
    :car="car"
    :report="editingReport"
    @update:open="reportModalOpen = $event"
  />
</template>
