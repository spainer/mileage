<script setup>
import EditableTable from '@/components/EditableTable.vue'

import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'

import { useCarsStore } from '@/stores/cars'

import { DATEPICKER_FORMAT, formatDate } from '@/utils/dateformat'

const carsStore = useCarsStore()

function saveMileage(mileage) {
    carsStore.saveMileage(mileage)
}

function deleteMileage(mileage) {
    carsStore.deleteMileage(mileage.id)
}

function formatDeleteMessage(mileage) {
    return `Do you really want to delete mileage from date ${formatDate(mileage.date)}?`
}
</script>

<template>
    <EditableTable :data="carsStore.currentCar?.mileages" dialogTitle="Edit Mileage" deleteHeader="Delete Mileage?" :deleteMessage="formatDeleteMessage" @save="saveMileage" @delete="deleteMileage">
        <template #table>
            <Column field="date" header="Date">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column field="value" header="Value" />
        </template>

        <template #dialog="{ data }">
            <FloatLabel variant="on" class="mt-1">
                <DatePicker v-model="data.date" id="date" :dateFormat="DATEPICKER_FORMAT" fluid />
                <label for="date">Date</label>
            </FloatLabel>
            <FloatLabel variant="on" class="mt-4">
                <InputNumber v-model="data.value" id="value" :format="false" fluid />
                <label for="value">Value</label>
            </FloatLabel>
        </template>
    </EditableTable>
</template>
