<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { errorMessage, formatDate, formatKm, todayIso } from '../format'
import { createInsuranceReport, deleteInsuranceReport, latestRecord, updateInsuranceReport } from '../state'
import type { Car, InsuranceReport } from '../types'

const props = defineProps<{
  open: boolean
  car: Car
  report: InsuranceReport | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({ date: '', odometerReading: '', mileagePerYear: '' })
const error = ref('')
const saving = ref(false)
const deleting = ref(false)

const { confirm } = useConfirm()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = ''
    saving.value = false
    deleting.value = false
    if (props.report) {
      form.date = props.report.date
      form.odometerReading = String(props.report.odometerReading)
      form.mileagePerYear = String(props.report.mileagePerYear)
    } else {
      form.date = todayIso()
      const latest = latestRecord(props.car.id)
      form.odometerReading = latest ? String(latest.odometerReading) : ''
      form.mileagePerYear = ''
    }
  },
)

function close() {
  emit('update:open', false)
}

function onOpenChange(value: boolean) {
  if (!value) {
    close()
  }
}

function save() {
  if (saving.value) return
  if (!form.date) {
    error.value = 'A date is required.'
    return
  }
  const reading = Number(form.odometerReading)
  if (form.odometerReading === '' || Number.isNaN(reading) || reading < 0) {
    error.value = 'An odometer reading in km (>= 0) is required.'
    return
  }
  const cap = Number(form.mileagePerYear)
  if (form.mileagePerYear === '' || Number.isNaN(cap) || cap < 0) {
    error.value = 'An annual mileage cap in km/year (>= 0) is required.'
    return
  }
  error.value = ''
  saving.value = true
  const data = { date: form.date, odometerReading: reading, mileagePerYear: cap }
  const request = props.report
    ? updateInsuranceReport(props.car.id, props.report.id, data)
    : createInsuranceReport(props.car.id, data)
  void request
    .then(() => {
      close()
    })
    .catch((err: unknown) => {
      error.value = errorMessage(err)
    })
    .finally(() => {
      saving.value = false
    })
}

async function remove() {
  const report = props.report
  if (!report || deleting.value) return
  const confirmed = await confirm({
    title: 'Delete report',
    message: `This deletes the report of ${formatKm(report.mileagePerYear)} km/year on ${formatDate(report.date)}.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  deleting.value = true
  error.value = ''
  try {
    await deleteInsuranceReport(props.car.id, report.id)
    close()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="report ? 'Edit report' : 'Add report'"
    description="The odometer reading and the annual mileage cap at a point in time."
    @update:open="onOpenChange"
  >
    <template #body>
      <div v-if="error" class="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField label="Date">
          <UInput v-model="form.date" type="date" />
        </UFormField>
        <UFormField label="Odometer reading (km)">
          <UInput v-model="form.odometerReading" type="number" min="0" placeholder="0" />
        </UFormField>
        <UFormField label="Annual mileage cap (km/year)">
          <UInput v-model="form.mileagePerYear" type="number" min="0" placeholder="0" />
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
          :disabled="saving || deleting"
          @click="remove"
        >
          Delete
        </UButton>
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="close">
          Cancel
        </UButton>
        <UButton color="primary" :disabled="saving || deleting" @click="save">
          {{ report ? 'Save' : 'Add report' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
