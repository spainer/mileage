<script setup lang="ts">
// PROTOTYPE ONLY — throwaway code. The locked-in design: a wall of car
// cards with key numbers; the detail opens transiently in a slideover.
// The dark style is fixed (see theme.ts).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { carLabel, formatKm } from './format'
import {
  carById,
  cars,
  currentReport,
  latestRecord,
  recordsForCar,
  reportsForCar,
} from './store'
import type { Car } from './types'
import { applyTheme, clearTheme, theme } from './theme'
import CarSlideover from './components/CarSlideover.vue'
import CarFormModal from './components/CarFormModal.vue'
import LicensePlate from './components/LicensePlate.vue'

onMounted(applyTheme)
onUnmounted(clearTheme)

const selectedCarId = ref<number | null>(null)
const selectedCar = computed<Car | undefined>(() => carById(selectedCarId.value))

const carFormOpen = ref(false)
const editingCar = ref<Car | null>(null)

function openCar(car: Car) {
  selectedCarId.value = car.id
}

function openAddCar() {
  editingCar.value = null
  carFormOpen.value = true
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl p-4 lg:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Garage</h1>
      <p class="text-sm text-muted">
        Every car at a glance; the detail opens on demand.
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="car in cars"
        :key="car.id"
        role="button"
        tabindex="0"
        class="group cursor-pointer rounded-xl border p-4 text-left transition-colors"
        :class="theme.card"
        @click="openCar(car)"
        @keydown.enter="openCar(car)"
        @keydown.space.prevent="openCar(car)"
      >
        <LicensePlate :license="car.license" size="sm" />
        <p class="mt-3 font-medium">{{ carLabel(car) }}</p>

        <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-lg p-2" :class="theme.statTile">
            <dt class="text-xs text-muted">Latest</dt>
            <dd class="font-medium tabular-nums">
              <template v-if="latestRecord(car.id)">
                {{ formatKm(latestRecord(car.id)!.odometerReading) }} km
              </template>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>
          <div class="rounded-lg p-2" :class="theme.statTile">
            <dt class="text-xs text-muted">Cap / year</dt>
            <dd class="font-medium tabular-nums">
              <template v-if="currentReport(car.id)">
                {{ formatKm(currentReport(car.id)!.mileagePerYear) }}
              </template>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>
        </dl>

        <p class="mt-3 text-xs text-muted">
          {{ recordsForCar(car.id).length }} reading{{ recordsForCar(car.id).length === 1 ? '' : 's' }} ·
          {{ reportsForCar(car.id).length }} report{{ reportsForCar(car.id).length === 1 ? '' : 's' }}
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

    <CarSlideover :car="selectedCar ?? null" @close="selectedCarId = null" />

    <CarFormModal
      :open="carFormOpen"
      :car="editingCar"
      @update:open="carFormOpen = $event"
      @car-added="openCar"
    />
  </div>
</template>
