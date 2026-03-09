import { defineStore } from "pinia"
import { ref } from "vue"
import { useCarsListStore } from "./cars-list"

export const useCurrentCarStore = defineStore("current-car", () => {
    const currentCarId = ref()

    const carsListStore = useCarsListStore()
    carsListStore.$subscribe((_mutation, state) => {
        if (state.cars.length && (!currentCarId.value || state.cars.findIndex(c => c.id === currentCarId.value) < 0)) {
            currentCarId.value = state.cars[0].id
        }
    })

    return { currentCarId }
})
