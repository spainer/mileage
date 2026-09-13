<script setup lang="ts">
// PROTOTYPE ONLY — design variant "Ledger": one dense list, one row per car,
// license plate leading, numbers right-aligned; the detail opens in the same
// slideover. Surface colors come from the active style draft (themes.ts).
import { computed, ref } from 'vue'
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
import type { StyleDraft } from './themes'
import CarSlideover from './components/CarSlideover.vue'
import CarFormModal from './components/CarFormModal.vue'

const props = defineProps<{
  theme: StyleDraft
}>()

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
    <header class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Garage</h1>
      <p class="text-sm text-muted">
        One ledger, one row per car; the detail opens on demand.
      </p>
    </header>

    <div class="overflow-hidden rounded-xl" :class="props.theme.card">
      <div
        class="hidden gap-4 border-b border-zinc-200/70 px-4 py-2 text-xs uppercase tracking-wide text-muted md:grid dark:border-zinc-700/70"
        style="grid-template-columns: 6rem minmax(0, 1fr) 7rem 7rem 2.5rem"
      >
        <span>Plate</span>
        <span>Car</span>
        <span class="text-right">Latest</span>
        <span class="text-right">Cap / year</span>
        <span />
      </div>

      <div class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div
          v-for="car in cars"
          :key="car.id"
          role="button"
          tabindex="0"
          class="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 md:grid-cols-[6rem_minmax(0,1fr)_7rem_7rem_2.5rem] md:gap-4 dark:hover:bg-zinc-800/40"
          @click="openCar(car)"
          @keydown.enter="openCar(car)"
          @keydown.space.prevent="openCar(car)"
        >
          <span
            class="justify-self-start rounded-md px-2 py-1 font-mono text-sm"
            :class="props.theme.licenseBadge"
          >
            {{ car.license }}
          </span>
          <div class="min-w-0">
            <p class="truncate font-medium">{{ carLabel(car) }}</p>
            <p class="truncate text-xs text-muted">
              {{ recordsForCar(car.id).length }} readings ·
              {{ reportsForCar(car.id).length }} reports
            </p>
          </div>
          <p class="hidden justify-self-end tabular-nums md:block">
            <template v-if="latestRecord(car.id)">
              {{ formatKm(latestRecord(car.id)!.odometerReading) }} km
            </template>
            <span v-else class="text-muted">—</span>
          </p>
          <p class="hidden justify-self-end tabular-nums md:block">
            <template v-if="currentReport(car.id)">
              {{ formatKm(currentReport(car.id)!.mileagePerYear) }}
            </template>
            <span v-else class="text-muted">—</span>
          </p>
          <div class="flex items-center justify-end gap-2">
            <span class="text-sm tabular-nums md:hidden">
              <template v-if="latestRecord(car.id)">
                {{ formatKm(latestRecord(car.id)!.odometerReading) }} km
              </template>
              <span v-else class="text-muted">—</span>
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-pencil"
              class="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 max-lg:opacity-60"
              aria-label="Edit car"
              @click.stop="openEditCar(car)"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        class="block w-full border-t border-dashed px-4 py-3 text-left text-sm transition-colors"
        :class="props.theme.addTile"
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
