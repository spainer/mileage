<script setup lang="ts">
// PROTOTYPE ONLY — shared transient car details: slideover with license-first
// header and iOS-style swipe-to-close. Nuxt UI has no built-in gesture, so the
// touch handling lives here, outside the library.
import { onUnmounted, watch } from 'vue'
import { carLabel } from '../format'
import type { Car } from '../types'
import CarDetails from './CarDetails.vue'

const props = defineProps<{ car: Car | null }>()
const emit = defineEmits<{ close: [] }>()

const SWIPE_EDGE = 40
const SWIPE_DISTANCE = 60
let swipeCleanup: (() => void) | null = null

function onOpenChange(value: boolean) {
  if (!value) emit('close')
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
  },
)
onUnmounted(() => swipeCleanup?.())
</script>

<template>
  <USlideover
    :open="car !== null"
    :title="car?.license"
    :description="car ? carLabel(car) : ''"
    class="w-full max-w-lg"
    @update:open="onOpenChange"
  >
    <template #body>
      <CarDetails v-if="car" :car="car" />
    </template>
  </USlideover>
</template>
