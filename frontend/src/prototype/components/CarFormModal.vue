<script setup lang="ts">
// PROTOTYPE ONLY — throwaway car create/edit modal.
import { reactive, ref, watch } from 'vue'
import { addCar, deleteCar, updateCar } from '../store'
import type { Car } from '../types'

const props = defineProps<{
  open: boolean
  car: Car | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'car-added': [car: Car]
}>()

const form = reactive({ manufacturer: '', model: '', license: '' })
const error = ref('')

watch(
  () => props.open,
  () => {
    if (!props.open) return
    error.value = ''
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

function onUpdateOpen(value: boolean) {
  emit('update:open', value)
}

function save() {
  const manufacturer = form.manufacturer.trim()
  const model = form.model.trim()
  const license = form.license.trim().toUpperCase()
  if (!manufacturer || !model || !license) {
    error.value = 'All fields are required.'
    return
  }
  const data = { manufacturer, model, license }
  if (props.car) {
    updateCar(props.car.id, data)
  } else {
    emit('car-added', addCar(data))
  }
  onUpdateOpen(false)
}

function remove() {
  if (!props.car) return
  const car = props.car
  if (!window.confirm(`Delete ${car.manufacturer} ${car.model} and all of its data?`)) return
  deleteCar(car.id)
  onUpdateOpen(false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="car ? 'Edit car' : 'Add car'"
    description="A car you drive, with its license plate."
    @update:open="onUpdateOpen"
  >
    <template #body>
      <div v-if="error" class="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
        {{ error }}
      </div>
      <form class="grid gap-4" @submit.prevent="save">
        <UFormField label="Manufacturer">
          <UInput v-model="form.manufacturer" placeholder="Volkswagen" />
        </UFormField>
        <UFormField label="Model">
          <UInput v-model="form.model" placeholder="Golf" />
        </UFormField>
        <UFormField label="License plate">
          <UInput v-model="form.license" placeholder="M-GC 4821" class="font-mono" />
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
          @click="remove"
        >
          Delete
        </UButton>
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="onUpdateOpen(false)">
          Cancel
        </UButton>
        <UButton color="primary" @click="save">
          {{ car ? 'Save' : 'Add car' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
