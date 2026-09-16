import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { applyTheme } from './theme'
import './assets/main.css'

const router = createRouter({
  routes: [
    {
      path: '/',
      name: 'garage',
      component: () => import('./views/GarageView.vue'),
    },
   ],
  history: createWebHistory(),
})

applyTheme()

const app = createApp(App)
app.use(ui)
app.use(router)
app.mount('#app')
