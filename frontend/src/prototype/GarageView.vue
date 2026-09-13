<script setup lang="ts">
// PROTOTYPE ONLY — throwaway Garage layout: a wall of car cards with key
// numbers; the detail opens transiently in a slideover. Surface colors come
// from the active style draft (see themes.ts).
import { computed, onUnmounted, ref, watch } from 'vue'
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
import CarDetails from './components/CarDetails.vue'
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

// iOS-style: right swipe anchored to the left screen edge closes the slideover.
// Nuxt UI has no built-in for this, so the gesture lives here, outside the library.
const SWIPE_EDGE = 40
const SWIPE_DISTANCE = 60
let swipeCleanup: (() => void) | null = null

function installSwipeClose() {
  let startX = 0
  let startY = 0
  let active = false

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    active = touch.clientX <= SWIPE_EDGE
    startX = touch.clientX
    startY = touch.clientY
  }

  const onTouchEnd = (event: TouchEvent) => {
    if (!active) return
    active = false
    const touch = event.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    if (dx >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      selectedCarId.value = null
    }
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  return () => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
  }
}

watch(
  () => selectedCar.value !== undefined,
  (open) => {
    swipeCleanup?.()
    swipeCleanup = open ? installSwipeClose() : null
  },
)
onUnmounted(() => swipeCleanup?.())
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
        :class="props.theme.card"
        @click="openCar(car)"
        @keydown.enter="openCar(car)"
        @keydown.space.prevent="openCar(car)"
      >
        <div class="flex items-start justify-between gap-2">
          <span
            class="rounded-md px-2 py-1 font-mono text-sm"
            :class="props.theme.licenseBadge"
          >
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
          <div class="rounded-lg p-2" :class="props.theme.statTile">
            <dt class="text-xs text-muted">Latest</dt>
            <dd class="font-medium tabular-nums">
              <template v-if="latestRecord(car.id)">
                {{ formatKm(latestRecord(car.id)!.odometerReading) }} km
              </template>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>
          <div class="rounded-lg p-2" :class="props.theme.statTile">
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
        :class="props.theme.addTile"
        @click="openAddCar"
      >
        + Add car
      </button>
    </div>

    <USlideover
      :open="selectedCar !== undefined"
      :title="selectedCar?.license"
      :description="selectedCar ? carLabel(selectedCar) : ''"
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
