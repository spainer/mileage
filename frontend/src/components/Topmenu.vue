<script setup>
import { ref } from 'vue';

import Menubar from 'primevue/menubar'
import Select from 'primevue/select'
import { useCarsListStore } from '@/stores/cars-list';
import { useCurrentCarStore } from '@/stores/current-car';
import { useRouter } from 'vue-router';

const router = useRouter()
const menuItems = router.getRoutes().filter(route => route.meta?.title).map(route => ({
    route: route.path,
    label: route.meta.title,
    icon: route.meta.icon ? `pi pi-${route.meta.icon}` : null
}))

const carsListStore = useCarsListStore()
const currentCarStore = useCurrentCarStore()

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
            <Select v-model="currentCarStore.currentCarId" :options="carsListStore.cars" optionValue="id" optionLabel="model"></Select>
        </template>
    </Menubar>
</template>