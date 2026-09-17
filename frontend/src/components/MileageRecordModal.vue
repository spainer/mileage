<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { errorMessage, formatDate, formatKm, todayIso } from '../format'
import { createMileageRecord, deleteMileageRecord, latestRecord, updateMileageRecord } from '../state'
import type { Car, MileageRecord } from '../types'

const props = defineProps<{
  open: boolean
  car: Car
  record: MileageRecord | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({ date: '', odometerReading: '' })
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
    if (props.record) {
      form.date = props.record.date
      form.odometerReading = String(props.record.odometerReading)
    } else {
      form.date = todayIso()
      const latest = latestRecord(props.car.id)
      form.odometerReading = latest ? String(latest.odometerReading) : ''
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
  error.value = ''
  saving.value = true
  const data = { date: form.date, odometerReading: reading }
  const request = props.record
    ? updateMileageRecord(props.car.id, props.record.id, data)
    : createMileageRecord(props.car.id, data)
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
  const record = props.record
  if (!record || deleting.value) return
  const confirmed = await confirm({
    title: 'Delete reading',
    message: `This deletes the reading of ${formatKm(record.odometerReading)} km on ${formatDate(record.date)}.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  deleting.value = true
  error.value = ''
  try {
    await deleteMileageRecord(props.car.id, record.id)
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
    :title="record ? 'Edit reading' : 'Add reading'"
    description="The odometer reading at a point in time."
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
      </form>
    </template>
    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="record"
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
          {{ record ? 'Save' : 'Add reading' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
