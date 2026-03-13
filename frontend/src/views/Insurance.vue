<script setup>
import EditableTable from '@/components/EditableTable.vue';

import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'

import { useCarsStore } from '@/stores/cars'

import { DATEPICKER_FORMAT, formatDate } from '@/utils/dateformat'

const carsStore = useCarsStore()

function saveInsurance(insurance) {
    carsStore.saveInsuranceMileage(insurance)
}

function deleteInsurance(insurance) {
    carsStore.deleteInsuranceMileage(insurance.id)
}

function formatDeleteMessage(insurance) {
    return `Do you really want to delete insurance mileage from date ${formatDate(insurance.date)}?`
}
</script>

<template>
    <EditableTable :data="carsStore.currentCar?.insurance" dialogTitle="Edit Insurance Mileage" deleteHeader="Delete Insurance Mileage?" :deleteMessage="formatDeleteMessage" @save="saveInsurance" @delete="deleteInsurance">
        <template #table>
            <Column field="date" header="Date">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column field="mileagePerYear" header="Mileage per Year" />
            <Column field="currentMileage" header="Current Mileage" />
        </template>

        <template #dialog="{ data }">
            <FloatLabel variant="on" class="mt-1">
                <DatePicker v-model="data.date" id="date" :dateFormat="DATEPICKER_FORMAT" fluid />
                <label for="date">Date</label>
            </FloatLabel>
            <FloatLabel variant="on" class="mt-4">
                <InputNumber v-model="data.mileagePerYear" id="mileagePerYear" :format="false" fluid />
                <label for="mileagePerYear">Mileage per Year</label>
            </FloatLabel>
            <FloatLabel variant="on" class="mt-4">
                <InputNumber v-model="data.currentMileage" id="currentMileage" :format="false" fluid />
                <label for="currentMileage">Current Mileage</label>
            </FloatLabel>
        </template>
    </EditableTable>
</template>
