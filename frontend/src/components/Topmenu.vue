<script setup>
import { watch } from 'vue';

import Menubar from 'primevue/menubar'
import Select from 'primevue/select'
import { useRouter } from 'vue-router';
import { useCarsStore } from '@/stores/cars';

const router = useRouter()
const menuItems = router.getRoutes().filter(route => route.meta?.title).map(route => ({
    route: route.path,
    label: route.meta.title,
    icon: route.meta.icon ? `pi pi-${route.meta.icon}` : null
}))

const carsStore = useCarsStore()
watch(() => carsStore.currentCarId, async id => {
    await carsStore.selectCar(id)
})
</script>

<template>
    <Menubar :model="menuItems">
        <template #item="{ item, props }">
            <router-link v-slot="{ href, navigate }" :to="item.route" custom>
                <a :href="href" v-bind="props.action" @click="navigate">
                    <span :class="item.icon" v-if="item.icon"></span>
                    <span>{{ item.label }}</span>
                </a>
            </router-link>
        </template>

        <template #end>
            <Select v-model="carsStore.currentCarId" :options="carsStore.carsList" optionValue="id" optionLabel="model"></Select>
        </template>
    </Menubar>
</template>