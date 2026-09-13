<script setup lang="ts">
// PROTOTYPE ONLY — Variant 2: Timeline. No car hierarchy: one flat,
// newest-first stream of every reading and report, filterable by car/type.
import { computed, ref } from 'vue'
import { carLabel, formatDate, formatKm } from '../format'
import {
  allEvents,
  carById,
  cars,
  deleteInsuranceReport,
  deleteMileageRecord,
  insuranceReports,
  mileageRecords,
} from '../store'
import type { InsuranceReport, MileageRecord } from '../types'
import type { TimelineEvent } from '../store'
import InsuranceReportModal from '../components/InsuranceReportModal.vue'
import MileageRecordModal from '../components/MileageRecordModal.vue'

const filterCarId = ref<number | 'all'>('all')
const filterKind = ref<'all' | 'record' | 'report'>('all')

const events = computed(() =>
  allEvents().filter(
    (event) =>
      (filterCarId.value === 'all' || event.carId === filterCarId.value) &&
      (filterKind.value === 'all' || event.kind === filterKind.value),
  ),
)

const carFilterItems = computed(() => [
  { label: 'All cars', value: 'all' as const },
  ...cars.value.map((car) => ({ label: `${carLabel(car)} · ${car.license}`, value: car.id })),
])

const kindOptions = [
  { label: 'All', value: 'all' },
  { label: 'Readings', value: 'record' },
  { label: 'Reports', value: 'report' },
] as const

function monthLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })
}

const grouped = computed(() => {
  const groups: { month: string; events: TimelineEvent[] }[] = []
  for (const event of events.value) {
    const month = monthLabel(event.date)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.events.push(event)
    else groups.push({ month, events: [event] })
  }
  return groups
})

// --- add / edit / delete -------------------------------------------------
const recordModalOpen = ref(false)
const editingRecord = ref<MileageRecord | null>(null)
const reportModalOpen = ref(false)
const editingReport = ref<InsuranceReport | null>(null)

function openAdd(kind: 'record' | 'report') {
  if (kind === 'record') {
    editingRecord.value = null
    recordModalOpen.value = true
  } else {
    editingReport.value = null
    reportModalOpen.value = true
  }
}

function openEdit(event: TimelineEvent) {
  if (event.kind === 'record') {
    const record = mileageRecords.value.find((item) => item.id === event.id)
    if (!record) return
    editingRecord.value = record
    recordModalOpen.value = true
  } else {
    const report = insuranceReports.value.find((item) => item.id === event.id)
    if (!report) return
    editingReport.value = report
    reportModalOpen.value = true
  }
}

function remove(event: TimelineEvent) {
  if (!window.confirm('Delete this entry?')) return
  if (event.kind === 'record') deleteMileageRecord(event.id)
  else deleteInsuranceReport(event.id)
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl p-4 lg:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Timeline</h1>
      <p class="text-sm text-muted">
        One flat stream of everything that happened, newest first — no car hierarchy.
      </p>
    </header>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <USelectMenu
        v-model="filterCarId"
        :items="carFilterItems"
        :search-input="false"
        value-key="value"
        class="w-full sm:w-56"
        aria-label="Filter by car"
      />
      <UButtonGroup>
        <UButton
          v-for="option in kindOptions"
          :key="option.value"
          :active="filterKind === option.value"
          :active-color="'primary'"
          :active-variant="'solid'"
          @click="filterKind = option.value"
        >
          {{ option.label }}
        </UButton>
      </UButtonGroup>
      <span class="grow" />
      <UButton size="sm" color="primary" icon="i-lucide-plus" @click="openAdd('record')">
        Reading
      </UButton>
      <UButton size="sm" color="primary" variant="outline" icon="i-lucide-plus" @click="openAdd('report')">
        Report
      </UButton>
    </div>

    <div v-if="grouped.length" class="grid gap-6">
      <section v-for="group in grouped" :key="group.month">
        <h2 class="sticky top-2 z-10 mb-3 w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-muted dark:bg-zinc-800">
          {{ group.month }}
        </h2>
        <ol class="relative grid gap-3 border-l pl-6">
          <li v-for="event in group.events" :key="`${event.kind}-${event.id}`" class="relative">
            <span
              class="absolute -left-[1.65rem] top-1.5 flex size-7 items-center justify-center rounded-full border"
              :class="
                event.kind === 'record'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-success bg-success/10 text-success'
              "
            >
              <UIcon
                :name="event.kind === 'record' ? 'i-lucide-gauge' : 'i-lucide-shield-check'"
                class="size-4"
              />
            </span>
            <div class="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-2">
                  <span class="font-medium tabular-nums">{{ formatKm(event.odometerReading) }} km</span>
                  <UBadge
                    :color="event.kind === 'record' ? 'primary' : 'success'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ event.kind === 'record' ? 'Reading' : 'Report' }}
                  </UBadge>
                  <UBadge
                    v-if="event.kind === 'report' && event.mileagePerYear !== undefined"
                    size="sm"
                    color="neutral"
                    variant="outline"
                  >
                    {{ formatKm(event.mileagePerYear) }} km/year
                  </UBadge>
                </p>
                <p class="mt-1 truncate text-sm text-muted">
                  {{ carLabel(carById(event.carId)!) }}
                  <span class="font-mono">· {{ carById(event.carId)!.license }}</span>
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="hidden text-xs text-muted tabular-nums sm:block">{{ formatDate(event.date) }}</span>
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" aria-label="Edit entry" @click="openEdit(event)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete entry" @click="remove(event)" />
              </div>
            </div>
          </li>
        </ol>
      </section>
    </div>
    <p v-else class="rounded-lg border border-dashed py-12 text-center text-sm text-muted">
      Nothing here for these filters.
    </p>

    <MileageRecordModal
      :open="recordModalOpen"
      :car-id="null"
      :record="editingRecord"
      @update:open="recordModalOpen = $event"
    />
    <InsuranceReportModal
      :open="reportModalOpen"
      :car-id="null"
      :report="editingReport"
      @update:open="reportModalOpen = $event"
    />
  </div>
</template>
