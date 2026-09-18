<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CarFormModal from '../components/CarFormModal.vue'
import CarSlideover from '../components/CarSlideover.vue'
import LicensePlate from '../components/LicensePlate.vue'
import { carLabel, formatDate, formatKm } from '../format'
import { theme } from '../theme'
import {
  carById,
  cars,
  currentReport,
  error,
  latestRecord,
  load,
  loading,
  recordsForCar,
  reportsForCar,
} from '../state'
import type { Car } from '../types'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  void load()
})

const retry = () => {
  void load()
}

const cards = computed(() =>
  cars.value.map((car) => ({
    car,
    latest: latestRecord(car.id),
    cap: currentReport(car.id),
    recordCount: recordsForCar(car.id).length,
    reportCount: reportsForCar(car.id).length,
  })),
)

function parseCarId(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const selectedCarId = computed(() => parseCarId(route.params.id))
const selectedCar = computed(() => carById(selectedCarId.value) ?? null)
watch(selectedCar, (car) => {
  if (selectedCarId.value !== null && car === null) {
    void router.replace('/')
  }
})

const addFormOpen = ref(false)

function openCar(car: Car) {
  void router.push(`/cars/${car.id}`)
}

function openAddCar() {
  addFormOpen.value = true
}

function onCarDeleted() {
  void router.replace('/')
}

function onSlideoverClose() {
  const state = window.history.state as { back?: string | null } | null
  if (state?.back) {
    router.back()
  } else {
    void router.push('/')
  }
}
</script>

<template>
  <div class="mx-auto h-full w-full max-w-5xl overflow-y-auto p-4 lg:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Garage</h1>
      <p class="text-sm text-muted">Every car at a glance.</p>
    </header>

    <USkeleton v-if="loading" class="h-32" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="solid"
      title="Could not load the garage"
      :description="error"
      :actions="[
        { label: 'Retry', color: 'error', variant: 'solid', size: 'sm', onClick: retry },
      ]"
    />

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="{ car, latest, cap, recordCount, reportCount } in cards"
          :key="car.id"
          role="button"
          tabindex="0"
          class="group cursor-pointer rounded-xl border p-4 text-left transition-colors"
          :class="theme.card"
          @click="openCar(car)"
          @keydown.enter.prevent="openCar(car)"
          @keydown.space.prevent="openCar(car)"
        >
          <LicensePlate :license="car.license" size="sm" />
          <p class="mt-3 font-medium">{{ carLabel(car) }}</p>

          <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-lg p-2" :class="theme.statTile">
              <dt class="text-xs text-muted">Latest</dt>
              <dd class="font-medium tabular-nums">
                <template v-if="latest">
                  {{ formatKm(latest.odometerReading) }} km
                  <span class="block text-xs font-normal text-muted">
                    {{ formatDate(latest.date) }}
                  </span>
                </template>
                <span v-else class="text-muted">—</span>
              </dd>
            </div>
            <div class="rounded-lg p-2" :class="theme.statTile">
              <dt class="text-xs text-muted">Cap / year</dt>
              <dd class="font-medium tabular-nums">
                <template v-if="cap">
                  {{ formatKm(cap.mileagePerYear) }}
                </template>
                <span v-else class="text-muted">—</span>
              </dd>
            </div>
          </dl>

          <p class="mt-3 text-xs text-muted">
            {{ recordCount }} reading{{ recordCount === 1 ? '' : 's' }} ·
            {{ reportCount }} report{{ reportCount === 1 ? '' : 's' }}
          </p>
        </div>

        <button
          type="button"
          class="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm transition-colors"
          :class="theme.addTile"
          @click="openAddCar"
        >
          + Add car
        </button>
      </div>
    </template>

    <CarSlideover :car="selectedCar" @close="onSlideoverClose" @car-deleted="onCarDeleted" />

    <CarFormModal
      :open="addFormOpen"
      :car="null"
      @update:open="addFormOpen = $event"
      @car-added="openCar"
    />
  </div>
</template>
