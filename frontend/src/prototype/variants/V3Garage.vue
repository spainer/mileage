<script setup lang="ts">
// PROTOTYPE ONLY — Variant 3: Garage. Overview-first: a wall of car cards
// with key numbers; the detail opens transiently in a slideover.
import { computed, ref } from 'vue'
import { carLabel, formatKm } from '../format'
import {
  carById,
  cars,
  currentReport,
  latestRecord,
  recordsForCar,
  reportsForCar,
} from '../store'
import type { Car } from '../types'
import CarDetails from '../components/CarDetails.vue'
import CarFormModal from '../components/CarFormModal.vue'

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

function openEditCar(car: Car) {
  editingCar.value = car
  carFormOpen.value = true
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl p-4 lg:p-8">
    <header class="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Garage</h1>
        <p class="text-sm text-muted">
          Every car at a glance; the detail opens on demand.
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="openAddCar">
        Add car
      </UButton>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="car in cars"
        :key="car.id"
        role="button"
        tabindex="0"
        class="group cursor-pointer rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-primary dark:border-zinc-800 dark:hover:border-primary"
        @click="openCar(car)"
        @keydown.enter="openCar(car)"
        @keydown.space.prevent="openCar(car)"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="rounded-md bg-zinc-100 px-2 py-1 font-mono text-sm dark:bg-zinc-800">
            {{ car.license }}
          </span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            class="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
            aria-label="Edit car"
            @click.stop="openEditCar(car)"
          />
        </div>
        <p class="mt-3 font-medium">{{ carLabel(car) }}</p>

        <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
            <dt class="text-xs text-muted">Latest</dt>
            <dd class="font-medium tabular-nums">
              <template v-if="latestRecord(car.id)">
                {{ formatKm(latestRecord(car.id)!.odometerReading) }} km
              </template>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>
          <div class="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
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
        class="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted transition-colors hover:text-foreground"
        @click="openAddCar"
      >
        + Add car
      </button>
    </div>

    <USlideover
      :open="selectedCar !== undefined"
      :title="selectedCar ? carLabel(selectedCar) : ''"
      :description="selectedCar?.license"
      class="w-full max-w-lg"
      @update:open="selectedCarId = $event ? selectedCarId : null"
    >
      <template #body>
        <CarDetails v-if="selectedCar" :car="selectedCar" />
      </template>
    </USlideover>

    <CarFormModal
      :open="carFormOpen"
      :car="editingCar"
      @update:open="carFormOpen = $event"
      @car-added="openCar"
    />
  </div>
</template>
