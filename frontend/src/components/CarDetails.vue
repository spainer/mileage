<script setup lang="ts">
import { computed, ref } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { errorMessage, formatDate, formatKm } from '../format'
import {
  currentReport,
  deleteInsuranceReport,
  deleteMileageRecord,
  latestRecord,
  mileageRowsForCar,
  reportsForCar,
} from '../state'
import type { Car, InsuranceReport, MileageRecord } from '../types'
import InsuranceReportModal from './InsuranceReportModal.vue'
import MileageRecordModal from './MileageRecordModal.vue'

const props = defineProps<{
  car: Car
}>()

const rows = computed(() => mileageRowsForCar(props.car.id))
const latest = computed(() => latestRecord(props.car.id))
const reports = computed(() => reportsForCar(props.car.id))
const inForce = computed(() => currentReport(props.car.id))

const recordModalOpen = ref(false)
const editingRecord = ref<MileageRecord | null>(null)
const deletingRecordId = ref<number | null>(null)
const deleteError = ref('')

const reportModalOpen = ref(false)
const editingReport = ref<InsuranceReport | null>(null)
const deletingReportId = ref<number | null>(null)
const reportDeleteError = ref('')

const { confirm } = useConfirm()

const rightAligned = { class: { th: 'text-right', td: 'text-right' } }

const mileageColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'delta', header: 'Since last', meta: rightAligned },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

const reportColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'mileagePerYear', header: 'Cap / year', meta: rightAligned },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } },
]

function deltaLabel(delta: number): string {
  return delta > 0 ? `+${formatKm(delta)}` : formatKm(delta)
}

function openAddRecord() {
  editingRecord.value = null
  recordModalOpen.value = true
}

function openEditRecord(record: MileageRecord) {
  editingRecord.value = record
  recordModalOpen.value = true
}

async function removeRecord(record: MileageRecord) {
  if (deletingRecordId.value !== null) return
  const confirmed = await confirm({
    title: 'Delete reading',
    message: `This deletes the reading of ${formatKm(record.odometerReading)} km on ${formatDate(record.date)}.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  deletingRecordId.value = record.id
  deleteError.value = ''
  try {
    await deleteMileageRecord(props.car.id, record.id)
  } catch (err) {
    deleteError.value = errorMessage(err)
  } finally {
    deletingRecordId.value = null
  }
}

function openAddReport() {
  editingReport.value = null
  reportModalOpen.value = true
}

function openEditReport(report: InsuranceReport) {
  editingReport.value = report
  reportModalOpen.value = true
}

async function removeReport(report: InsuranceReport) {
  if (deletingReportId.value !== null) return
  const confirmed = await confirm({
    title: 'Delete report',
    message: `This deletes the report of ${formatKm(report.mileagePerYear)} km/year on ${formatDate(report.date)}.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  deletingReportId.value = report.id
  reportDeleteError.value = ''
  try {
    await deleteInsuranceReport(props.car.id, report.id)
  } catch (err) {
    reportDeleteError.value = errorMessage(err)
  } finally {
    deletingReportId.value = null
  }
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

        <div
          v-if="deleteError"
          class="rounded-lg bg-error/10 px-3 py-2 text-sm text-error"
          role="alert"
        >
          {{ deleteError }}
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
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit reading"
                  :disabled="deletingRecordId !== null"
                  @click="openEditRecord(row.original)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-trash-2"
                  aria-label="Delete reading"
                  :disabled="deletingRecordId !== null"
                  @click="removeRecord(row.original)"
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
          <UCard v-for="row in rows" :key="row.id">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium tabular-nums">
                  {{ formatKm(row.odometerReading) }} km
                </p>
                <p class="text-sm text-muted tabular-nums">
                  {{ formatDate(row.date) }}
                  <span v-if="row.delta !== null"> · {{ deltaLabel(row.delta) }} km</span>
                  <span v-else> · —</span>
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit reading"
                  :disabled="deletingRecordId !== null"
                  @click="openEditRecord(row)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-trash-2"
                  aria-label="Delete reading"
                  :disabled="deletingRecordId !== null"
                  @click="removeRecord(row)"
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

        <div
          v-if="reportDeleteError"
          class="rounded-lg bg-error/10 px-3 py-2 text-sm text-error"
          role="alert"
        >
          {{ reportDeleteError }}
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
              <div class="flex justify-end gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit report"
                  :disabled="deletingReportId !== null"
                  @click="openEditReport(row.original)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-trash-2"
                  aria-label="Delete report"
                  :disabled="deletingReportId !== null"
                  @click="removeReport(row.original)"
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
              <div class="flex shrink-0 gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  aria-label="Edit report"
                  :disabled="deletingReportId !== null"
                  @click="openEditReport(row)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-trash-2"
                  aria-label="Delete report"
                  :disabled="deletingReportId !== null"
                  @click="removeReport(row)"
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
