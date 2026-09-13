<script setup lang="ts">
// PROTOTYPE ONLY — Variant 1: Master–Detail. The car is the home base:
// prominent car selector (sidebar on desktop, chip strip on mobile),
// per-car detail with mileage/insurance tabs.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { carLabel, formatKm } from '../format'
import { carById, cars, currentReport, latestRecord } from '../store'
import type { Car } from '../types'
import CarDetails from '../components/CarDetails.vue'
import CarFormModal from '../components/CarFormModal.vue'

const route = useRoute()
const router = useRouter()

function carFromQuery(): Car | undefined {
  const query = route.query.car
  if (typeof query !== 'string') return undefined
  const id = Number(query)
  return Number.isInteger(id) ? carById(id) : undefined
}

const selectedCar = computed<Car | undefined>(() => carFromQuery() ?? cars.value[0])

function select(car: Car) {
  router.replace({ query: { ...route.query, car: String(car.id) } })
}

const carFormOpen = ref(false)
const editingCar = ref<Car | null>(null)

function openAddCar() {
  editingCar.value = null
  carFormOpen.value = true
}

function openEditCar() {
  editingCar.value = selectedCar.value ?? null
  carFormOpen.value = true
}

function onCarAdded(car: Car) {
  select(car)
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl p-4 lg:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Master–Detail</h1>
      <p class="text-sm text-muted">
        The car is the home base: pick a car, manage its readings and reports there.
      </p>
    </header>

    <template v-if="selectedCar">
      <!-- Mobile / tablet: horizontally scrollable car strip -->
      <div class="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        <button
          v-for="car in cars"
          :key="car.id"
          type="button"
          class="shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors"
          :class="
            car.id === selectedCar.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900'
          "
          @click="select(car)"
        >
          <span class="font-mono">{{ car.license }}</span>
          <span class="ml-2 text-xs opacity-70">{{ car.manufacturer }}</span>
        </button>
        <button
          type="button"
          class="shrink-0 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted"
          @click="openAddCar"
        >
          + Add
        </button>
      </div>

      <div class="lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-6">
        <!-- Desktop: sidebar list -->
        <aside class="hidden lg:block">
          <div class="grid gap-2">
            <button
              v-for="car in cars"
              :key="car.id"
              type="button"
              class="rounded-xl border p-3 text-left transition-colors"
              :class="
                car.id === selectedCar.id
                  ? 'border-primary bg-primary/10'
                  : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
              "
              @click="select(car)"
            >
              <span class="font-mono text-sm text-muted">{{ car.license }}</span>
              <p class="font-medium">{{ carLabel(car) }}</p>
              <p class="text-xs text-muted">
                <template v-if="latestRecord(car.id)">
                  {{ formatKm(latestRecord(car.id)!.odometerReading) }} km ·
                </template>
                cap
                <span v-if="currentReport(car.id)">
                  {{ formatKm(currentReport(car.id)!.mileagePerYear) }}/y
                </span>
                <span v-else>—</span>
              </p>
            </button>
            <UButton variant="dashed" color="neutral" icon="i-lucide-plus" class="justify-center" @click="openAddCar">
              Add car
            </UButton>
          </div>
        </aside>

        <!-- Detail pane -->
        <section>
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-mono text-sm text-muted">{{ selectedCar.license }}</p>
              <h2 class="truncate text-xl font-semibold">{{ carLabel(selectedCar) }}</h2>
            </div>
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-pencil" aria-label="Edit car" @click="openEditCar" />
          </div>
          <CarDetails :car="selectedCar" />
        </section>
      </div>
    </template>

    <UCard v-else>
      <p class="text-center text-muted">No cars yet.</p>
      <div class="mt-4 flex justify-center">
        <UButton color="primary" icon="i-lucide-plus" @click="openAddCar">
          Add your first car
        </UButton>
      </div>
    </UCard>

    <CarFormModal
      :open="carFormOpen"
      :car="editingCar"
      @update:open="carFormOpen = $event"
      @car-added="onCarAdded"
    />
  </div>
</template>
