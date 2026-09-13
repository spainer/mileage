<script setup lang="ts">
// PROTOTYPE ONLY — design variant "Cockpit": one featured car as the star of
// the page, the rest as a strip; the detail still opens in the same
// slideover. Surface colors come from the active style draft (themes.ts).
import { computed, ref } from 'vue'
import { carLabel, formatDate, formatKm } from './format'
import {
  carById,
  cars,
  currentReport,
  latestRecord,
  recordsForCar,
  reportsForCar,
} from './store'
import type { Car } from './types'
import type { StyleDraft } from './themes'
import CarSlideover from './components/CarSlideover.vue'
import CarFormModal from './components/CarFormModal.vue'
import LicensePlate from './components/LicensePlate.vue'

const props = defineProps<{
  theme: StyleDraft
}>()

const featuredCarId = ref<number | null>(null)
const selectedCarId = ref<number | null>(null)
const selectedCar = computed<Car | undefined>(() => carById(selectedCarId.value))

const carFormOpen = ref(false)
const editingCar = ref<Car | null>(null)

const featuredCar = computed<Car | undefined>(() =>
  carById(featuredCarId.value) ?? cars.value[0],
)
const otherCars = computed<Car[]>(() =>
  cars.value.filter((car) => car.id !== featuredCar.value?.id),
)

// Selecting a car re-features it AND opens its details; closing the
// slideover keeps the selection featured.
function openCar(car: Car) {
  featuredCarId.value = car.id
  selectedCarId.value = car.id
}

function openAddCar() {
  editingCar.value = null
  carFormOpen.value = true
}

function openEditCar(car: Car) {
  editingCar.value = car
  carFormOpen.value = true
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl p-4 lg:p-8">
    <header class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Garage</h1>
        <p class="text-sm text-muted">
          The featured car up front, the rest in the strip.
        </p>
      </div>
      <UButton size="sm" variant="ghost" icon="i-lucide-plus" @click="openAddCar">
        Add car
      </UButton>
    </header>

    <section
      v-if="featuredCar"
      class="mb-6 rounded-2xl p-6 lg:p-8"
      :class="props.theme.card"
    >
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm uppercase tracking-wide text-muted">Featured</p>
          <h2 class="mt-1 text-3xl font-semibold tracking-tight">
            {{ carLabel(featuredCar) }}
          </h2>
          <LicensePlate :license="featuredCar.license" class="mt-3" />
        </div>

        <div class="flex flex-wrap gap-3">
          <div
            class="min-w-40 rounded-xl p-4"
            :class="props.theme.statTile"
          >
            <p class="text-xs uppercase tracking-wide text-muted">Latest reading</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums">
              <template v-if="latestRecord(featuredCar.id)">
                {{ formatKm(latestRecord(featuredCar.id)!.odometerReading) }}
              </template>
              <span v-else class="text-muted">—</span>
              <span v-if="latestRecord(featuredCar.id)" class="text-sm font-normal text-muted">
                km · {{ formatDate(latestRecord(featuredCar.id)!.date) }}
              </span>
            </p>
          </div>
          <div class="min-w-40 rounded-xl p-4" :class="props.theme.statTile">
            <p class="text-xs uppercase tracking-wide text-muted">Cap / year</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums">
              <template v-if="currentReport(featuredCar.id)">
                {{ formatKm(currentReport(featuredCar.id)!.mileagePerYear) }}
              </template>
              <span v-else class="text-muted">—</span>
            </p>
          </div>
        </div>
      </div>

      <p class="mt-6 text-sm text-muted">
        {{ recordsForCar(featuredCar.id).length }} readings ·
        {{ reportsForCar(featuredCar.id).length }} insurance reports
      </p>

      <div class="mt-6 flex gap-2">
        <UButton size="sm" variant="soft" color="neutral" icon="i-lucide-pencil" @click="openEditCar(featuredCar)">
          Edit car
        </UButton>
        <UButton size="sm" icon="i-lucide-circle-info" @click="openCar(featuredCar)">
          Open details
        </UButton>
      </div>
    </section>

    <section v-if="otherCars.length > 0" aria-label="Other cars">
      <p class="mb-2 text-xs uppercase tracking-wide text-muted">Others in the garage</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="car in otherCars"
          :key="car.id"
          type="button"
          class="flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors"
          :class="props.theme.card"
          @click="openCar(car)"
        >
          <span
            class="rounded border px-1.5 py-0.5 font-mono text-xs"
            :class="props.theme.licenseBadge"
          >
            {{ car.license }}
          </span>
          <span class="font-medium">{{ carLabel(car) }}</span>
        </button>
      </div>
    </section>

    <CarSlideover :car="selectedCar ?? null" @close="selectedCarId = null" />

    <CarFormModal
      :open="carFormOpen"
      :car="editingCar"
      @update:open="carFormOpen = $event"
      @car-added="openCar"
    />
  </div>
</template>
