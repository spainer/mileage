import { ref } from "vue"
import { defineStore } from "pinia"
import axios from "axios"

import { dateToApi } from "@/utils/dateformat"

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
        car.mileages = responses[1].data.map(apiToData)
        car.insurance = responses[2].data.map(apiToData)
        car.evaluation = responses[3].data.map(apiToData)
        carsCache.value[id] = car
        currentCar.value = car

        return car
    }

    async function saveCar(car) {
        if (car.id) {
            const response = await axios.put(`${API_PREFIX}/${car.id}`, {
                license: car.license,
                model: car.model
            })
            const updatedCar = response.data

            const listIdx = carsList.value.findIndex(c => c.id === updatedCar.id)
            if (listIdx >= 0) {
                carsList.value[listIdx].license = updatedCar.license
                carsList.value[listIdx].model = updatedCar.model
            }

            if (updatedCar.id in carsCache.value) {
                const cached = carsCache.value[updatedCar.id]
                carsCache.value[updatedCar.id] = {
                    ...updatedCar,
                    mileages: cached.mileages,
                    insurance: cached.insurance,
                    evaluation: cached.evaluation
                }
            }

            return selectCar(updatedCar.id)
        } else {
            const response = await axios.post(API_PREFIX, {
                license: car.license,
                model: car.model
            })
            const newCar = response.data

            currentCarId.value = newCar.id
            await refreshCars()
            return currentCar.value
        }
    }

    async function deleteCar(id) {
        const response = await axios.delete(`${API_PREFIX}/${id}`)

        if (id in carsCache.value) {
            delete carsCache.value[id]
        }

        await refreshCars()
    }

    async function saveMileage(mileage) {
        if (mileage.id) {

        } else {
            const response = await axios.post(
                `${API_PREFIX}/${currentCarId.value}/mileages`, 
                dataToApi(mileage)
            )
            const newMileage = apiToData(response.data)
            currentCar.value.mileages.push(newMileage)
            await refreshEvaluation()
            return newMileage
        }
    }

    async function deleteMileage(id) {
        const response = await axios.delete(`${API_PREFIX}/${currentCarId.value}/mileages/${id}`)

        const listIdx = currentCar.value.mileages.findIndex(m => m.id === id)
        if (listIdx >= 0) {
            currentCar.value.mileages.splice(listIdx, 1)
        }

        await refreshEvaluation()
    }

    async function refreshEvaluation() {
        const response = await axios.get(`${API_PREFIX}/${currentCarId.value}/evaluate`)
        currentCar.value.evaluation = response.data.map(apiToData)
    }

    function apiToData(api) {
        return {
            ...api,
            date: new Date(api.date)
        }
    }

    function dataToApi(data) {
        return {
            ...data,
            date: dateToApi(data.date)
        }
    }

    refreshCars()

    return {
        carsList,
        currentCarId,
        currentCar,
        carsCache,
        refreshCars,
        selectCar,
        saveCar,
        deleteCar,
        saveMileage,
        deleteMileage
    }
})