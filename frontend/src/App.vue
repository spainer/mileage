<script setup>
import { RouterView } from 'vue-router'

import ConfirmDialog from 'primevue/confirmdialog'
import Topbar from './components/Topmenu.vue'
</script>

<template>
  <div class="h-screen container sm:border border-gray-200 rounded-sm m-auto flex flex-col">
    <header class="flex-none">
      <Topbar/>
    </header>

    <main class="flex-1">
      <RouterView/>
    </main>

    <ConfirmDialog />
  </div>
</template>
