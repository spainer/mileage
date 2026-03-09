<script setup>
import { ref } from 'vue';

import Menubar from 'primevue/menubar'
import Select from 'primevue/select'
import { useCarsListStore } from '@/stores/cars-list';
import { useCurrentCarStore } from '@/stores/current-car';

const carsListStore = useCarsListStore()
const currentCarStore = useCurrentCarStore()

const items = ref([
    { label: 'Seite 1' },
    { label: 'Seite 2' },
    { label: 'Seite 3' },
    { label: 'Seite 4' },
])
</script>

<template>
    <Menubar :model="items">
        <template #end>
            <Select v-model="currentCarStore.currentCarId" :options="carsListStore.cars" optionValue="id" optionLabel="model"></Select>
        </template>
    </Menubar>
</template>