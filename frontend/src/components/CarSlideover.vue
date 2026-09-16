<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

import { carLabel } from '../format'
import type { Car } from '../types'
import CarDetails from './CarDetails.vue'
import CarFormModal from './CarFormModal.vue'
import LicensePlate from './LicensePlate.vue'

const props = defineProps<{ car: Car | null }>()
const emit = defineEmits<{ close: []; 'car-deleted': [carId: number] }>()

const editOpen = ref(false)

function openEdit() {
  editOpen.value = true
}

const SWIPE_EDGE = 40
const SWIPE_DISTANCE = 60
let swipeCleanup: (() => void) | null = null

function onOpenChange(value: boolean) {
  if (!value) {
    emit('close')
  }
}

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
      emit('close')
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
  () => props.car !== null,
  (open) => {
    swipeCleanup?.()
    swipeCleanup = open ? installSwipeClose() : null
    if (!open) editOpen.value = false
  },
)
onUnmounted(() => swipeCleanup?.())
</script>

<template>
  <USlideover
    :open="car !== null"
    :close="false"
    :description="car ? carLabel(car) : ''"
    class="w-full max-w-lg"
    @update:open="onOpenChange"
  >
    <template v-if="car" #title>
      <LicensePlate :license="car.license" />
    </template>
    <template v-if="car" #actions>
      <span class="grow" />
      <UButton
        size="sm"
        variant="ghost"
        icon="i-lucide-pencil"
        aria-label="Edit car"
        @click="openEdit"
      />
    </template>
    <template v-if="car" #body>
      <CarDetails :car="car" />
    </template>
  </USlideover>
  <CarFormModal
    v-if="car"
    :open="editOpen"
    :car="car"
    @update:open="editOpen = $event"
    @car-deleted="(carId) => emit('car-deleted', carId)"
  />
</template>
