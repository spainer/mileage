<script setup>
import { useCarsStore } from '@/stores/cars'
import { ref, watch } from 'vue'

import { useConfirm } from 'primevue/useconfirm'

import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'

const confirm = useConfirm()

const carsStore = useCarsStore()

const formCar = ref({})
watch(() => carsStore.currentCar, car => {
    formCar.value = { ...car }
}, { immediate: true })

function clear() {
    formCar.value = { ...carsStore.currentCar }
}

function createNew() {
    formCar.value = {}
}

function save() {
    carsStore.saveCar(formCar.value)
}

function deleteCar() {
    confirm.require({
        header: "Delete Car",
        message: `Do you really want to delete car ${carsStore.currentCar.model} (${carsStore.currentCar.license})?`,
        accept: () => carsStore.deleteCar(carsStore.currentCar.id)
    })
}
</script>

<template>
    <div>
        <FloatLabel variant="on" class="mt-4">
            <InputText id="license" v-model="formCar.license" fluid />
            <label for="license">License</label>
        </FloatLabel>

        <FloatLabel variant="on" class="mt-4">
            <InputText id="model" v-model="formCar.model" fluid />
            <label for="model">Model</label>
        </FloatLabel>

        <div class="mt-4 float-right">
            <Button label="Clear" icon="pi pi-undo" class="mr-1 sm:mr-4" @click="clear" />
            <Button label="New" icon="pi pi-plus" class="mr-1 sm:mr-4" @click="createNew" />
            <Button label="Save" icon="pi pi-save" class="mr-1 sm:mr-4" @click="save" />
            <Button label="Delete" icon="pi pi-trash" severity="danger" class="mr-1 sm:mr-4" @click="deleteCar" />
        </div>

        <ConfirmDialog></ConfirmDialog>
    </div>
</template>