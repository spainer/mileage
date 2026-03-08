<script setup>
import { ref } from 'vue';

import Menubar from 'primevue/menubar'
import Select from 'primevue/select'

const items = ref([
    { label: 'Seite 1' },
    { label: 'Seite 2' },
    { label: 'Seite 3' },
    { label: 'Seite 4' },
])

const cars = ref([
    { id: 'abc', value: 'VW' },
    { id: 'def', value: 'Twingo' }
])

const car = ref(cars.value[0].id)

</script>

<template>
    <Menubar :model="items">
        <!-- <template #start>
            <i class="pi pi-car" style="font-size: 2rem"></i>
        </template> -->
        <template #end>
            <Select v-model="car" :options="cars" optionValue="id" optionLabel="value"></Select>
        </template>
    </Menubar>
</template>