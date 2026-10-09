<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { errorMessage, formatDate, formatKm, todayIso } from '../format'
import { i18n } from '../i18n'
import { boundsHint, fieldError } from '../odometerSequence'
import {
  createMileageRecord,
  deleteMileageRecord,
  entriesForCar,
  updateMileageRecord,
} from '../state'
import type { RecordRow } from '../state'
import type { Car } from '../types'

const props = defineProps<{
  open: boolean
  car: Car
  record: RecordRow | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({ date: '', odometerReading: '' })
const error = ref('')
const saving = ref(false)
const deleting = ref(false)

const { confirm } = useConfirm()

const t = i18n.global.t

const excludeId = computed(() => (props.record ? props.record.id : undefined))

const entries = computed(() =>
  entriesForCar(props.car.id, excludeId.value),
)

const hint = computed(() => {
  if (readingError.value) return null
  return boundsHint(entries.value, form.date)
})

const readingError = computed(() => {
  if (!form.date || form.odometerReading === '') return null
  const reading = Number(form.odometerReading)
  if (Number.isNaN(reading)) return null
  return fieldError(entries.value, form.date, reading)
})

const canSubmit = computed(() => {
  if (!form.date) return false
  if (form.odometerReading === '') return false
  const reading = Number(form.odometerReading)
  if (Number.isNaN(reading) || reading < 0) return false
  if (readingError.value) return false
  return true
})

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
      form.odometerReading = ''
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
  if (!canSubmit.value) {
    if (!form.date) {
      error.value = t('readingForm.dateRequired')
      return
    }
    const reading = Number(form.odometerReading)
    if (form.odometerReading === '' || Number.isNaN(reading) || reading < 0) {
      error.value = t('readingForm.readingRequired')
      return
    }
    if (readingError.value) {
      error.value = readingError.value
      return
    }
    return
  }
  error.value = ''
  saving.value = true
  const reading = Number(form.odometerReading)
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
    title: t('readingForm.deleteTitle'),
    message: t('readingForm.deleteMessage', {
      km: formatKm(record.odometerReading),
      date: formatDate(record.date),
    }),
    confirmLabel: t('form.delete'),
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
    :title="record ? t('car.editReading') : t('car.addReading')"
    :description="t('readingForm.description')"
    @update:open="onOpenChange"
  >
    <template #body>
      <div v-if="error" class="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField :label="t('car.date')">
          <UInput v-model="form.date" type="date" />
        </UFormField>
        <UFormField
          :label="t('readingForm.reading')"
          :description="hint ?? undefined"
          :error="readingError ?? undefined"
        >
          <UInput
            v-model="form.odometerReading"
            type="number"
            min="0"
            placeholder="0"
          />
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
          {{ t('form.delete') }}
        </UButton>
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="close">
          {{ t('form.cancel') }}
        </UButton>
        <UButton
          color="primary"
          :disabled="saving || deleting || !canSubmit"
          @click="save"
        >
          {{ record ? t('form.save') : t('car.addReading') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
