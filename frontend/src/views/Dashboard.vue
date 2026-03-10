<script setup>
import { useCarsStore } from '@/stores/cars'

const carsStore = useCarsStore()
</script>
<template>
    <div>{{ carsStore.carsList }}</div>
</template>