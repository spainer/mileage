import axios from "axios"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useCarsListStore = defineStore('carsList', () => {
    const cars = ref([])

    function refresh() {
        axios.get("/api/cars").then(response => cars.value = response.data)
    }

    refresh()

    return { cars, refresh }
})
