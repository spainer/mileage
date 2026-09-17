<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { useConfirm } from '../composables/useConfirm'
import { carLabel, isValidLicense, normalizeLicense } from '../format'
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
      licenseError.value = 'License must be a valid German license (e.g. M-AB1234).'
    } else {
      licenseError.value = undefined
    }
  },
)

function close() {
  emit('update:open', false)
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong.'
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
    error.value = 'All fields are required.'
    return
  }
  if (!isValidLicense(license)) {
    error.value = 'License must be a valid German license (e.g. M-AB1234).'
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
    title: 'Delete car',
    message: `This deletes ${carLabel(car)} together with all of its Mileage Records and Insurance Reports.`,
    confirmLabel: 'Delete',
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
    :title="car ? 'Edit car' : 'Add car'"
    @update:open="onOpenChange"
  >
    <template #body>
      <div v-if="error" class="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField label="Manufacturer">
          <UInput v-model="form.manufacturer" placeholder="Volkswagen" />
        </UFormField>
        <UFormField label="Model">
          <UInput v-model="form.model" placeholder="Golf" />
        </UFormField>
        <UFormField label="License" :error="licenseError">
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
          Delete
        </UButton>
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="close">
          Cancel
        </UButton>
        <UButton color="primary" :disabled="saving || deleting" @click="save">
          {{ car ? 'Save' : 'Add car' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
