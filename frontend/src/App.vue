<script setup lang="ts">
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useIosSwipeBackPatch } from './composables/useIosSwipeBackPatch'

useIosSwipeBackPatch()
</script>

<template>
   <UApp>
     <RouterView />
     <ConfirmDialog />
   </UApp>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>
