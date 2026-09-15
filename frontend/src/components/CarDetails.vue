<script setup lang="ts">
import { computed } from 'vue'

import { formatDate, formatKm } from '../format'
import {
  currentReport,
  latestRecord,
  mileageRowsForCar,
  reportsForCar,
} from '../state'
import type { Car } from '../types'

const props = defineProps<{
  car: Car
}>()

const rows = computed(() => mileageRowsForCar(props.car.id))
const latest = computed(() => latestRecord(props.car.id))
const reports = computed(() => reportsForCar(props.car.id))
const inForce = computed(() => currentReport(props.car.id))

const rightAligned = { class: { th: 'text-right', td: 'text-right' } }

const mileageColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'delta', header: 'Since last', meta: rightAligned },
]

const reportColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'odometerReading', header: 'Reading', meta: rightAligned },
  { accessorKey: 'mileagePerYear', header: 'Cap / year', meta: rightAligned },
]

function deltaLabel(delta: number): string {
  return delta > 0 ? `+${formatKm(delta)}` : formatKm(delta)
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
        <p v-if="latest" class="truncate text-sm text-muted">
          Latest:
          <span class="font-medium text-foreground">
            {{ formatKm(latest.odometerReading) }} km
          </span>
          on {{ formatDate(latest.date) }}
        </p>
        <p v-else class="text-sm text-muted">No readings yet</p>

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
            <p class="font-medium tabular-nums">
              {{ formatKm(row.odometerReading) }} km
            </p>
            <p class="text-sm text-muted tabular-nums">
              {{ formatDate(row.date) }}
              <span v-if="row.delta !== null"> · {{ deltaLabel(row.delta) }} km</span>
              <span v-else> · —</span>
            </p>
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
        <p class="truncate text-sm text-muted">
          In force:
          <span v-if="inForce" class="font-medium text-foreground">
            {{ formatKm(inForce.mileagePerYear) }} km/year
          </span>
          <span v-else>no report yet</span>
        </p>

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
</template>
