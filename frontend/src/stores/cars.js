import { ref } from "vue"
import { defineStore } from "pinia"
import axios from "axios"

const API_PREFIX = '/api/cars'

export const useCarsStore = defineStore('cars', () => {
    const carsList = ref([])
    const currentCarId = ref()
    const currentCar = ref()
    const carsCache = ref({})

    async function refreshCars() {
        carsCache.value = {}

        const carsReponse = await axios.get(API_PREFIX)
        const cars = carsReponse.data
        carsList.value = cars

        if (cars.length > 0) {
            if (cars.findIndex(c => c.id === currentCarId.value) >= 0) {
                await selectCar(currentCarId.value)
            } else {
                await selectCar(cars[0].id)
            }
        } else if (currentCarId.value) {
            currentCarId.value = null
            currentCar.value = null
        }

        return cars
    }

    async function selectCar(id) {
        currentCarId.value = id

        if (id in carsCache.value) {
            const car = carsCache.value[id]
            currentCar.value = car
            return car
        }

        const responses = await Promise.all([
            axios.get(`${API_PREFIX}/${id}`),
            axios.get(`${API_PREFIX}/${id}/mileages`),
            axios.get(`${API_PREFIX}/${id}/insurance-mileages`),
            axios.get(`${API_PREFIX}/${id}/evaluate`)
        ])

        const car = responses[0].data
        car.mileages = responses[1].data
        car.insurance = responses[2].data
        car.evaluation = responses[3].data
        carsCache.value[id] = car
        currentCar.value = car

        return car
    }

    refreshCars()

    return {
        carsList,
        currentCarId,
        currentCar,
        carsCache,
        refreshCars,
        selectCar
    }
})