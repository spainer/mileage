<script setup lang="ts">
// PROTOTYPE ONLY — throwaway per-car detail: mileage + insurance tabs.
import { computed, ref } from 'vue'
import { formatDate, formatKm } from '../format'
import {
  currentReport,
  deleteInsuranceReport,
  deleteMileageRecord,
  recordsForCar,
  reportsForCar,
} from '../store'
import type { Car, InsuranceReport, MileageRecord } from '../types'
import InsuranceReportModal from './InsuranceReportModal.vue'
import MileageRecordModal from './MileageRecordModal.vue'

const props = defineProps<{
  car: Car
}>()

const recordModalOpen = ref(false)
const editingRecord = ref<MileageRecord | null>(null)
const reportModalOpen = ref(false)
const editingReport = ref<InsuranceReport | null>(null)

const records = computed(() => recordsForCar(props.car.id))
const reports = computed(() => reportsForCar(props.car.id))
const inForce = computed(() => currentReport(props.car.id))

// Newest first; delta = difference to the previous (older) reading.
const recordRows = computed(() =>
  records.value.map((record, index) => ({
    ...record,
    delta: records.value[index + 1]
      ? record.odometerReading - records.value[index + 1].odometerReading
      : null,
  })),
)

const mileageColumns = [
  { accessorKey: 'date', header: 'Date' },
  {
    accessorKey: 'odometerReading',
    header: 'Reading',
    meta: { class: { th: 'text-right', td: 'text-right' } },
  },
  {
    accessorKey: 'delta',
    header: 'Since last',
    meta: { class: { th: 'text-right', td: 'text-right' } },
  },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

const reportColumns = [
  { accessorKey: 'date', header: 'Date' },
  {
    accessorKey: 'odometerReading',
    header: 'Reading',
    meta: { class: { th: 'text-right', td: 'text-right' } },
  },
  {
    accessorKey: 'mileagePerYear',
    header: 'Cap / year',
    meta: { class: { th: 'text-right', td: 'text-right' } },
  },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

function openAddRecord() {
  editingRecord.value = null
  recordModalOpen.value = true
}

function openEditRecord(record: MileageRecord) {
  editingRecord.value = record
  recordModalOpen.value = true
}

function removeRecord(record: MileageRecord) {
  if (window.confirm('Delete this reading?')) deleteMileageRecord(record.id)
}

function openAddReport() {
  editingReport.value = null
  reportModalOpen.value = true
}

function openEditReport(report: InsuranceReport) {
  editingReport.value = report
  reportModalOpen.value = true
}

function removeReport(report: InsuranceReport) {
  if (window.confirm('Delete this report?')) deleteInsuranceReport(report.id)
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
          <p v-if="records.length" class="truncate text-sm text-muted">
            Latest: <span class="font-medium text-foreground">{{ formatKm(records[0].odometerReading) }} km</span>
            on {{ formatDate(records[0].date) }}
          </p>
          <p v-else class="text-sm text-muted">No readings yet</p>
          <UButton size="sm" color="primary" icon="i-lucide-plus" @click="openAddRecord">
            Add reading
          </UButton>
        </div>

        <!-- Desktop: table -->
        <div class="hidden md:block">
          <UTable v-if="recordRows.length" :data="recordRows" :columns="mileageColumns">
            <template #date-cell="{ row }">
              <span class="tabular-nums">{{ formatDate(row.original.date) }}</span>
            </template>
            <template #odometerReading-cell="{ row }">
              <span class="font-medium tabular-nums">{{ formatKm(row.original.odometerReading) }} km</span>
            </template>
            <template #delta-cell="{ row }">
              <span v-if="row.original.delta !== null" class="tabular-nums text-success">
                +{{ formatKm(row.original.delta) }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" aria-label="Edit reading" @click="openEditRecord(row.original)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete reading" @click="removeRecord(row.original)" />
              </div>
            </template>
          </UTable>
          <p v-else class="rounded-lg border border-dashed py-8 text-center text-sm text-muted">
            No mileage readings yet.
          </p>
        </div>

        <!-- Mobile: cards -->
        <div class="grid gap-2 md:hidden">
          <UCard v-for="row in recordRows" :key="row.id">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium tabular-nums">{{ formatKm(row.odometerReading) }} km</p>
                <p class="text-sm text-muted tabular-nums">
                  {{ formatDate(row.date) }}
                  <span v-if="row.delta !== null">· +{{ formatKm(row.delta) }} km</span>
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" aria-label="Edit reading" @click="openEditRecord(row)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete reading" @click="removeRecord(row)" />
              </div>
            </div>
          </UCard>
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

        <!-- Desktop: table -->
        <div class="hidden md:block">
          <UTable v-if="reports.length" :data="reports" :columns="reportColumns">
            <template #date-cell="{ row }">
              <span class="tabular-nums">{{ formatDate(row.original.date) }}</span>
            </template>
            <template #odometerReading-cell="{ row }">
              <span class="tabular-nums">{{ formatKm(row.original.odometerReading) }} km</span>
            </template>
            <template #mileagePerYear-cell="{ row }">
              <div class="flex items-center justify-end gap-2">
                <span class="font-medium tabular-nums">{{ formatKm(row.original.mileagePerYear) }}</span>
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
              <div class="flex justify-end gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" aria-label="Edit report" @click="openEditReport(row.original)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete report" @click="removeReport(row.original)" />
              </div>
            </template>
          </UTable>
          <p v-else class="rounded-lg border border-dashed py-8 text-center text-sm text-muted">
            No insurance reports yet.
          </p>
        </div>

        <!-- Mobile: cards -->
        <div class="grid gap-2 md:hidden">
          <UCard v-for="row in reports" :key="row.id">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium tabular-nums">
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
              <div class="flex shrink-0 gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" aria-label="Edit report" @click="openEditReport(row)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete report" @click="removeReport(row)" />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UTabs>

  <MileageRecordModal
    :open="recordModalOpen"
    :car-id="car.id"
    :record="editingRecord"
    @update:open="recordModalOpen = $event"
  />
  <InsuranceReportModal
    :open="reportModalOpen"
    :car-id="car.id"
    :report="editingReport"
    @update:open="reportModalOpen = $event"
  />
</template>
