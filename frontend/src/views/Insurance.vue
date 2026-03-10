<script setup>
import { useCarsStore } from '@/stores/cars'

const carsStore = useCarsStore()
</script>
<template>
    <div>{{ carsStore.currentCar?.insurance }}</div>
</template>