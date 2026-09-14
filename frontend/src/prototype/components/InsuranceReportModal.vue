<script setup lang="ts">
// PROTOTYPE ONLY — throwaway insurance-report create/edit modal.
import { computed, reactive, ref, watch } from 'vue'
import { carLabel, todayIso } from '../format'
import {
  addInsuranceReport,
  cars,
  deleteInsuranceReport,
  latestRecord,
  updateInsuranceReport,
} from '../store'
import type { InsuranceReport } from '../types'

const props = defineProps<{
  open: boolean
  // When null, the modal lets you pick the car.
  carId: number | null
  report: InsuranceReport | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({
  carId: 0,
  date: '',
  odometerReading: '',
  mileagePerYear: '',
})
const error = ref('')

watch(
  () => props.open,
  () => {
    if (!props.open) return
    error.value = ''
    if (props.report) {
      form.carId = props.report.carId
      form.date = props.report.date
      form.odometerReading = String(props.report.odometerReading)
      form.mileagePerYear = String(props.report.mileagePerYear)
    } else {
      form.carId = props.carId ?? (cars.value[0]?.id ?? 0)
      form.date = todayIso()
      const latest = props.carId ? latestRecord(props.carId) : undefined
      form.odometerReading = latest ? String(latest.odometerReading) : ''
      form.mileagePerYear = ''
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
  const cap = Number(form.mileagePerYear)
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
  if (form.mileagePerYear === '' || Number.isNaN(cap) || cap < 0) {
    error.value = 'An annual mileage cap in km/year (>= 0) is required.'
    return
  }
  if (props.report) {
    updateInsuranceReport(props.report.id, {
      date: form.date,
      odometerReading: reading,
      mileagePerYear: cap,
    })
  } else {
    addInsuranceReport(carId, { date: form.date, odometerReading: reading, mileagePerYear: cap })
  }
  onUpdateOpen(false)
}

function remove() {
  if (!props.report) return
  if (!window.confirm('Delete this report?')) return
  deleteInsuranceReport(props.report.id)
  onUpdateOpen(false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="report ? 'Edit insurance report' : 'Add insurance report'"
    description="Mileage declared to the insurer, with the annual cap."
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
        <UFormField label="Mileage per year (km)">
          <UInput v-model="form.mileagePerYear" type="number" min="0" placeholder="12000" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="report"
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
          {{ report ? 'Save' : 'Add report' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
