import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { handleStaleAssetError, installStaleAssetRecovery } from './appRecovery'
import { i18n } from './i18n'
import { applyTheme } from './theme'
import './assets/main.css'

const router = createRouter({
  routes: [
    {
      path: '/',
      name: 'garage',
      component: () => import('./views/GarageView.vue'),
    },
    {
      path: '/cars/:id',
      name: 'car',
      component: () => import('./views/GarageView.vue'),
    },
  ],
  history: createWebHistory(),
})

applyTheme()

installStaleAssetRecovery()

// A failed load of a lazy route component does not surface as an unhandled
// rejection: the router handles the navigation failure itself. This handler
// is where such failures are reported, so stale-asset recovery is wired in
// here as well.
router.onError((error) => {
  handleStaleAssetError(error)
})

const app = createApp(App)
app.use(ui)
app.use(i18n)
app.use(router)
app.mount('#app')
