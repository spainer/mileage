<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { carLabel, errorMessage, isValidLicense, normalizeLicense } from '../format'
import { i18n } from '../i18n'
import { createCar, deleteCar, updateCar } from '../state'
import type { Car } from '../types'

const props = defineProps<{
  open: boolean
  car: Car | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'car-added': [car: Car]
  'car-deleted': [carId: number]
}>()

const form = reactive({ manufacturer: '', model: '', license: '' })
const error = ref('')
const licenseError = ref<string | undefined>(undefined)
const saving = ref(false)
const deleting = ref(false)

const { confirm } = useConfirm()

const t = i18n.global.t

watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = ''
    licenseError.value = undefined
    saving.value = false
    deleting.value = false
    if (props.car) {
      form.manufacturer = props.car.manufacturer
      form.model = props.car.model
      form.license = props.car.license
    } else {
      form.manufacturer = ''
      form.model = ''
      form.license = ''
    }
  },
)

watch(
  () => form.license,
  (license) => {
    if (!license) {
      licenseError.value = undefined
      return
    }
    const normalized = normalizeLicense(license)
    if (!isValidLicense(normalized)) {
      licenseError.value = t('carForm.licenseInvalid')
    } else {
      licenseError.value = undefined
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
  const manufacturer = form.manufacturer.trim()
  const model = form.model.trim()
  const license = normalizeLicense(form.license)
  if (!manufacturer || !model || !license) {
    error.value = t('carForm.allRequired')
    return
  }
  if (!isValidLicense(license)) {
    error.value = t('carForm.licenseInvalid')
    return
  }
  error.value = ''
  saving.value = true
  const data = { manufacturer, model, license }
  const request = props.car ? updateCar(props.car.id, data) : createCar(data)
  void request
    .then((saved) => {
      if (!props.car) emit('car-added', saved)
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
  const car = props.car
  if (!car || deleting.value) return
  const confirmed = await confirm({
    title: t('carForm.deleteTitle'),
    message: t('carForm.deleteMessage', { car: carLabel(car) }),
    confirmLabel: t('form.delete'),
  })
  if (!confirmed) return
  deleting.value = true
  error.value = ''
  try {
    await deleteCar(car.id)
    emit('car-deleted', car.id)
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
    :title="car ? t('car.editCar') : t('carForm.titleAdd')"
    @update:open="onOpenChange"
  >
    <template #body>
      <div v-if="error" class="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField :label="t('carForm.manufacturer')">
          <UInput v-model="form.manufacturer" placeholder="Volkswagen" />
        </UFormField>
        <UFormField :label="t('carForm.model')">
          <UInput v-model="form.model" placeholder="Golf" />
        </UFormField>
        <UFormField :label="t('carForm.license')" :error="licenseError">
          <UInput v-model="form.license" placeholder="M-AB 1234" class="font-mono" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="car"
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
        <UButton color="primary" :disabled="saving || deleting" @click="save">
          {{ car ? t('form.save') : t('carForm.titleAdd') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
