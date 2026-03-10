import { createRouter, createWebHistory } from 'vue-router'

import Dashboard from '@/views/Dashboard.vue'
import CarEdit from '@/views/CarEdit.vue'
import Mileage from '@/views/Mileage.vue'
import Insurance from '@/views/Insurance.vue'
import Evaluation from '@/views/Evaluation.vue'
import NotFound from '@/views/NotFound.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Dashboard,
      meta: {
        title: 'Dashboard',
        icon: 'home'
      }
    },
    {
      path: '/car-edit',
      component: CarEdit,
      meta: {
        title: 'Edit Car',
        icon: 'pen-to-square'
      }
    },
    {
      path: '/mileage',
      component: Mileage,
      meta: {
        title: 'Mileage',
        icon: 'gauge'
      }
    },
    {
      path: '/insurance',
      component: Insurance,
      meta: {
        title: 'Insurance',
        icon: 'shield'
      }
    },
    {
      path: '/evaluation',
      component: Evaluation,
      meta: {
        title: 'Evaluation',
        icon: 'chart-scatter'
      }
    },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ],
})

export default router
