<script setup lang="ts">
// PROTOTYPE ONLY — throwaway mileage-record create/edit modal.
import { computed, reactive, ref, watch } from 'vue'
import { carLabel, todayIso } from '../format'
import {
  addMileageRecord,
  cars,
  deleteMileageRecord,
  latestRecord,
  updateMileageRecord,
} from '../store'
import type { MileageRecord } from '../types'

const props = defineProps<{
  open: boolean
  // When null, the modal lets you pick the car.
  carId: number | null
  record: MileageRecord | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({
  carId: 0,
  date: '',
  odometerReading: '',
})
const error = ref('')

watch(
  () => props.open,
  () => {
    if (!props.open) return
    error.value = ''
    if (props.record) {
      form.carId = props.record.carId
      form.date = props.record.date
      form.odometerReading = String(props.record.odometerReading)
    } else {
      form.carId = props.carId ?? (cars.value[0]?.id ?? 0)
      form.date = todayIso()
      const latest = props.carId ? latestRecord(props.carId) : undefined
      form.odometerReading = latest ? String(latest.odometerReading) : ''
    }
  },
)

const carItems = computed(() =>
  cars.value.map((car) => ({ label: `${carLabel(car)} · ${car.license}`, value: car.id })),
)

function onUpdateOpen(value: boolean) {
  emit('update:open', value)
}

function save() {
  const carId = Number(form.carId)
  const reading = Number(form.odometerReading)
  if (!carId || !cars.value.some((car) => car.id === carId)) {
    error.value = 'Choose a car.'
    return
  }
  if (!form.date) {
    error.value = 'A date is required.'
    return
  }
  if (form.odometerReading === '' || Number.isNaN(reading) || reading < 0) {
    error.value = 'An odometer reading in km (>= 0) is required.'
    return
  }
  if (props.record) {
    updateMileageRecord(props.record.id, { date: form.date, odometerReading: reading })
  } else {
    addMileageRecord(carId, { date: form.date, odometerReading: reading })
  }
  onUpdateOpen(false)
}

function remove() {
  if (!props.record) return
  if (!window.confirm('Delete this reading?')) return
  deleteMileageRecord(props.record.id)
  onUpdateOpen(false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="record ? 'Edit reading' : 'Add reading'"
    description="Odometer value at a point in time."
    @update:open="onUpdateOpen"
  >
    <template #body>
      <div v-if="error" class="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField v-if="!carId" label="Car">
          <USelectMenu v-model="form.carId" :items="carItems" :search-input="false" value-key="value" />
        </UFormField>
        <UFormField label="Date">
          <UInput v-model="form.date" type="date" />
        </UFormField>
        <UFormField label="Odometer reading (km)">
          <UInput v-model="form.odometerReading" type="number" min="0" placeholder="0" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="record"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="remove"
        >
          Delete
        </UButton>
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="onUpdateOpen(false)">
          Cancel
        </UButton>
        <UButton color="primary" @click="save">
          {{ record ? 'Save' : 'Add reading' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
