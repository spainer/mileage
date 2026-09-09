import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'

const router = createRouter({
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
    },
   ],
  history: createWebHistory(),
})

const app = createApp(App)
app.use(ui)
app.use(router)
app.mount('#app')
