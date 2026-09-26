<script setup lang="ts">
import { ref, watch } from 'vue'

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

function onOpenChange(value: boolean) {
  if (!value && props.car !== null) {
    emit('close')
  }
}

function onCarDeleted(carId: number) {
  emit('car-deleted', carId)
}

watch(
  () => props.car,
  (car) => {
    if (!car) editOpen.value = false
  },
)
</script>

<template>
  <!-- #51: the panel and backdrop must close without an animation on every
       close path. The library's transition prop gates opening and closing
       alike, so the opening transition is removed along with it
       (owner-approved relaxation of #50). -->
  <USlideover
    :open="car !== null"
    :close="false"
    :transition="false"
    :description="car ? carLabel(car) : ''"
    class="w-full max-w-lg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
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
    @car-deleted="onCarDeleted"
  />
</template>