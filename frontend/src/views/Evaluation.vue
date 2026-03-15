<script setup>
import { ref, watch } from 'vue'

import Chart from 'primevue/chart'

import { format } from 'date-fns'

import { useCarsStore } from '@/stores/cars'
import { DATE_FNS_LOCALE } from '@/utils/dateformat'

const data = ref({
    datasets: [
        {
            label: 'Mileage',
            borderColor: '#36A2EB',
            backgroundColor: '#9AD0F5',
            data: []
        },
        {
            label: 'Insurance',
            borderColor: '#FF6384',
            backgroundColor: '#FFB1C1',
            fill: {
                target: 'origin',
                above: '#9af38a64'
            },
            data: []
        }
    ]
})

const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'month'
            },
            adapters: {
                date: {
                    locale: DATE_FNS_LOCALE
                }
            }
        }
    },
    plugins: {
        tooltip: {
            callbacks: {
                title: items => format(items[0].parsed.x, "dd.MM.yyyy", { locale: DATE_FNS_LOCALE }),
                footer: items => `Balance: ${items[0].raw.balance}`
            }
        }
    }
}

const carsStore = useCarsStore()

watch(() => carsStore.currentCar?.evaluation, evaluation => {
    if (evaluation) {
        data.value.datasets[0].data = evaluation.map(ev => ({ x: ev.date, y: ev.mileage, balance: ev.balance }))
        data.value.datasets[1].data = evaluation.map(ev => ({ x: ev.date, y: ev.insuranceLimit, balance: ev.balance }))
    } else {
        data.value.datasets[0].data = []
        data.value.datasets[1].data = []
    }
}, { immediate: true })
</script>

<template>
    <Chart type="line" :data="data" :options="options" class="w-full h-full" />
</template>
